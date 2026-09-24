'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Loader2,
  Truck,
  ShoppingBag,
  X,
  Check,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useCart, getCartLineKey, formatVariantLabel } from '@/lib/cartStore';
import {
  cartNoticeMessage,
  useCartQuoteSync,
} from '@/hooks/cart/cartQuoteQuery';
import axios from 'axios';
import { paymentsApi, shippingApi, type ShippingMethod } from '@/lib/api';
import { useCreateOrderMutation } from '@/hooks/orders/ordersQuery';
import { useValidateCoupon } from '@/hooks/coupons/couponsQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { getAuthToken } from '@/lib/authCookies';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useAddresses, useCreateAddress } from '@/hooks/profile/addressesQuery';
import type { Address, CouponValidationResponse } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

type AppliedCoupon = NonNullable<CouponValidationResponse['coupon']>;

type CheckoutValues = {
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  notes: string;
  delivery: boolean;
};

/** Only for local/dev: complete checkout without opening Stripe (creates an unpaid order). */
const allowCheckoutWithoutStripe =
  process.env.NEXT_PUBLIC_ALLOW_CHECKOUT_WITHOUT_STRIPE === 'true';

function isStripeUnavailableForFallback(stripeErr: unknown): boolean {
  if (!axios.isAxiosError(stripeErr)) return false;
  const status = stripeErr.response?.status;
  const payload = stripeErr.response?.data;
  const code =
    payload &&
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    typeof (payload as { code: unknown }).code === 'string'
      ? (payload as { code: string }).code
      : undefined;

  if (status === 503) return true;
  if (status === 422 && code === 'STRIPE_SECRET_MISSING') return true;
  return false;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, formatPrice } = useTranslation();
  const cart = useCart();
  const createOrder = useCreateOrderMutation();
  const confirm = useConfirm();
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  // Saved address book: only for signed-in shoppers; guests see the plain form.
  const addressesQuery = useAddresses();
  const createAddress = useCreateAddress();
  const savedAddresses = addressesQuery.data ?? [];
  // `null` = "Use a new address"; otherwise the selected address id.
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [addressPickerReady, setAddressPickerReady] = useState(false);
  // Offered only when checking out with a new (unsaved) address.
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  // Shipping methods
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] =
    useState<string>('');
  const [fetchingShippingMethods, setFetchingShippingMethods] = useState(false);

  const items = cart.state.items;
  const subtotal = cart.subtotal;
  const discountedSubtotal = Math.max(
    0,
    subtotal - (appliedCoupon?.discountAmount || 0),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      city: '',
      zip: '',
      country: 'US',
      notes: '',
      delivery: false,
    },
    mode: 'onTouched',
    shouldUnregister: true,
  });

  const deliverySelected = Boolean(watch('delivery'));
  const shippingMethod = deliverySelected
    ? selectedShippingMethod || 'standard'
    : 'none';

  /**
   * Copy a saved address onto the form. Only the shipping fields are touched —
   * `notes` and `delivery` stay whatever the shopper chose for this order.
   */
  const applySavedAddress = (addr: Address) => {
    const opts = { shouldValidate: true, shouldDirty: true } as const;
    setValue('name', addr.name, opts);
    setValue('phone', addr.phone, opts);
    setValue('address', addr.address, opts);
    setValue('city', addr.city, opts);
    setValue('zip', addr.zip, opts);
    setValue('country', addr.country || 'US', opts);
  };

  // Pre-select the default address once, the first time the book arrives.
  useEffect(() => {
    if (addressPickerReady || savedAddresses.length === 0) return;
    const preferred =
      savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    setSelectedAddressId(preferred._id);
    applySavedAddress(preferred);
    setAddressPickerReady(true);
    // applySavedAddress only closes over the stable RHF setValue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressPickerReady, savedAddresses]);

  const handleSelectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr._id);
    applySavedAddress(addr);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId(null);
    setShippingMethods([]);
    const opts = { shouldValidate: false, shouldDirty: true } as const;
    setValue('name', '', opts);
    setValue('phone', '', opts);
    setValue('address', '', opts);
    setValue('city', '', opts);
    setValue('zip', '', opts);
  };

  // Fetch shipping methods when address changes
  useEffect(() => {
    const country = watch('country')?.toUpperCase?.();
    const zip = watch('zip');
    const region = watch('city');

    if (!country || !deliverySelected) {
      setShippingMethods([]);
      return;
    }

    let cancelled = false;
    setFetchingShippingMethods(true);

    shippingApi
      .getMethods({ country, zip, region })
      .then((res) => {
        if (!cancelled) {
          setShippingMethods(res.data || []);
          if (res.data?.length) {
            const firstMethod = res.data[0];
            setSelectedShippingMethod(firstMethod.handle);
          } else {
            setSelectedShippingMethod('');
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShippingMethods([]);
          setSelectedShippingMethod('');
        }
      })
      .finally(() => {
        if (!cancelled) setFetchingShippingMethods(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    watch('country'),
    watch('zip'),
    watch('city'),
    deliverySelected,
    shippingApi,
  ]);

  // Server-side quote (same intent fields as the checkout payload). Falls
  // back to client-side totals while loading or if the endpoint is missing.
  const { quote, notices } = useCartQuoteSync({
    items,
    couponCode: appliedCoupon?.code,
    delivery: deliverySelected,
    shippingMethod: deliverySelected ? selectedShippingMethod : 'none',
  });
  const itemsPrice = quote?.itemsPrice ?? subtotal;
  const discountAmount =
    quote?.discountAmount ?? (appliedCoupon?.discountAmount || 0);
  const shippingPrice = quote?.shippingPrice ?? (deliverySelected ? 5 : 0);
  const taxPrice = quote?.taxPrice ?? 0;
  const total = quote?.totalPrice ?? discountedSubtotal + shippingPrice;
  const couponRejectedByServer = Boolean(
    quote && appliedCoupon && quote.couponValid === false,
  );
  const presentKeys = new Set(items.map(getCartLineKey));
  const removedNotices = Object.entries(notices).filter(
    ([key]) => !presentKeys.has(key),
  );

  const couponMutation = useValidateCoupon();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast(t('checkoutPage.toast.enterCoupon'), { variant: 'error' });
      return;
    }

    setValidatingCoupon(true);
    try {
      const result = await couponMutation.mutateAsync({
        code: couponCode,
        orderAmount: discountedSubtotal,
      });
      if (result.valid && result.coupon) {
        setAppliedCoupon(result.coupon);
        toast(t('checkoutPage.toast.couponApplied'), { variant: 'success' });
        setCouponCode('');
      } else {
        toast(result.message || t('checkoutPage.toast.invalidCouponCode'), {
          variant: 'error',
        });
      }
    } catch (err) {
      logErrorForDev(err);
      toast(
        getUserFacingErrorMessage(
          err,
          t('checkoutPage.toast.couponValidateFailed'),
          t,
        ),
        { variant: 'error' },
      );
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast(t('checkoutPage.toast.couponRemoved'), { variant: 'info' });
  };

  const runCheckout = async (values: CheckoutValues) => {
    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        variant: i.variant,
      })),
      shippingAddress: {
        name: values.name,
        phone: values.phone,
        address: values.address,
        city: values.city,
        zip: values.zip,
        country: values.country,
        notes: values.notes,
      },
      // Server computes shipping/tax/discount — send intent flags + coupon only
      delivery: Boolean(values.delivery),
      shippingMethod: values.delivery
        ? (selectedShippingMethod as 'standard' | 'express')
        : ('none' as const),
      couponCode:
        appliedCoupon && !couponRejectedByServer
          ? appliedCoupon.code
          : undefined,
    };

    // Best-effort: save a brand-new address to the book before we leave for
    // Stripe (or complete the dev-mode order below). Never blocks checkout —
    // a failed save is silent since the order itself is what matters here.
    if (selectedAddressId === null && saveNewAddress) {
      createAddress
        .mutateAsync({
          name: values.name,
          phone: values.phone,
          address: values.address,
          city: values.city,
          zip: values.zip,
          country: values.country,
        })
        .catch((err) => logErrorForDev(err));
    }

    try {
      setStripeRedirecting(true);

      let stripeReady = false;
      try {
        const status = await paymentsApi.getSetupStatus();
        stripeReady = Boolean(status?.ready);
      } catch {
        stripeReady = false;
      }

      if (!stripeReady) {
        if (!allowCheckoutWithoutStripe) {
          toast(
            t('checkoutPage.toast.paymentNotConfigured'),
            {
              title: t('checkoutPage.toast.paymentUnavailableTitle'),
              variant: 'error',
            },
          );
          return;
        }
      } else {
        try {
          const session = await paymentsApi.createCheckoutSession(payload);
          if (session?.url) {
            window.location.assign(session.url);
            return;
          }
          toast(t('checkoutPage.toast.noCheckoutUrl'), {
            title: t('checkoutPage.toast.checkoutFailed'),
            variant: 'error',
          });
          return;
        } catch (stripeErr: unknown) {
          if (
            allowCheckoutWithoutStripe &&
            isStripeUnavailableForFallback(stripeErr)
          ) {
            logErrorForDev(stripeErr);
            // Dev-only: fall through to direct order creation below
          } else {
            logErrorForDev(stripeErr);
            // Handle 502 and other server errors with user-friendly message
            if (
              axios.isAxiosError(stripeErr) &&
              stripeErr.response?.status === 502
            ) {
              toast(
                t('checkoutPage.toast.paymentPageUnavailable'),
                {
                  title: t('checkoutPage.toast.checkoutFailed'),
                  variant: 'error',
                },
              );
            } else {
              const msg = getUserFacingErrorMessage(
                stripeErr,
                t('checkoutPage.toast.couldNotStartCheckout'),
                t,
              );
              toast(msg, {
                title: t('checkoutPage.toast.checkoutFailed'),
                variant: 'error',
              });
            }
            return;
          }
        }
      }

      if (!allowCheckoutWithoutStripe) {
        toast(t('checkoutPage.toast.secureCheckoutUnavailable'), {
          title: t('checkoutPage.toast.checkoutFailed'),
          variant: 'error',
        });
        return;
      }

      const order = await createOrder.mutateAsync(payload);

      cart.clearCart();
      toast(t('checkoutPage.toast.devOrderSaved'), {
        title: t('checkoutPage.toast.devCheckoutTitle'),
        variant: 'info',
      });
      router.push(`/user/orders/${order._id}`);
    } catch (err: unknown) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(
        err,
        t('checkoutPage.toast.checkoutFailed'),
        t,
      );
      toast(msg, {
        title: t('checkoutPage.toast.checkoutFailed'),
        variant: 'error',
      });
    } finally {
      setStripeRedirecting(false);
    }
  };

  const onSubmit = handleSubmit((values) => {
    const token = getAuthToken();
    if (!token) {
      toast(t('checkoutPage.toast.loginToContinue'), {
        title: t('checkoutPage.toast.loginRequiredTitle'),
        variant: 'info',
      });
      router.push('/auth/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      toast(t('checkoutPage.toast.cartEmpty'), {
        title: t('checkoutPage.title'),
        variant: 'error',
      });
      router.push('/');
      return;
    }

    void confirm({
      variant: 'payment',
      title: t('checkoutPage.confirm.title'),
      description: t('checkoutPage.confirm.description', {
        total: formatPrice(total),
      }),
      confirmLabel: t('checkoutPage.confirm.continueToPayment'),
      cancelLabel: t('checkoutPage.confirm.reviewDetails'),
      closeOnBackdrop: false,
      onConfirm: async () => {
        await runCheckout(values);
      },
    });
  });

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
          <Truck className='h-4 w-4 text-fuchsia-700' />
          {t('checkoutPage.title')}
        </div>
        <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
          {t('checkoutPage.heading')}
        </h1>
        <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
          {t('checkoutPage.intro')}
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'
        >
          <form
            onSubmit={onSubmit}
            className='space-y-4'
          >
            {savedAddresses.length > 0 && (
              <fieldset className='rounded-2xl border border-white/40 bg-white/40 p-4'>
                <legend className='px-1 text-sm font-extrabold text-indigo-950/80'>
                  {t('checkoutPage.savedAddresses.title')}
                </legend>
                <div className='mt-1 space-y-2'>
                  {savedAddresses.map((addr) => (
                    <label
                      key={addr._id}
                      className='flex cursor-pointer items-start gap-3 rounded-xl border border-white/50 bg-white/60 p-3 transition-colors hover:bg-white/80'
                    >
                      <input
                        type='radio'
                        name='savedAddress'
                        className='mt-1 h-4 w-4'
                        checked={selectedAddressId === addr._id}
                        onChange={() => handleSelectSavedAddress(addr)}
                      />
                      <span className='min-w-0'>
                        <span className='flex flex-wrap items-center gap-2'>
                          <span className='text-sm font-bold text-indigo-950'>
                            {addr.label || t('checkoutPage.savedAddresses.home')}
                          </span>
                          {addr.isDefault && (
                            <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800'>
                              {t('checkoutPage.savedAddresses.default')}
                            </span>
                          )}
                        </span>
                        <span className='mt-1 block text-sm text-indigo-950/70'>
                          {addr.name} · {addr.phone}
                        </span>
                        <span className='block text-sm text-indigo-950/70'>
                          {addr.address}, {addr.city} {addr.zip}
                          {addr.country ? `, ${addr.country}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}

                  <label className='flex cursor-pointer items-center gap-3 rounded-xl border border-white/50 bg-white/60 p-3 transition-colors hover:bg-white/80'>
                    <input
                      type='radio'
                      name='savedAddress'
                      className='h-4 w-4'
                      checked={selectedAddressId === null}
                      onChange={handleUseNewAddress}
                    />
                    <span className='text-sm font-bold text-indigo-950'>
                      {t('checkoutPage.savedAddresses.useNew')}
                    </span>
                  </label>
                </div>
              </fieldset>
            )}

            <div>
              <label htmlFor='checkout-name' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('checkoutPage.form.fullName')}
              </label>
              <Input
                id='checkout-name'
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? 'checkout-name-error' : undefined}
                placeholder={t('checkoutPage.form.namePlaceholder')}
                {...register('name', {
                  required: t('checkoutPage.validation.nameRequired'),
                  minLength: {
                    value: 2,
                    message: t('checkoutPage.validation.minChars', {
                      count: 2,
                    }),
                  },
                  maxLength: {
                    value: 200,
                    message: t('checkoutPage.validation.maxChars', {
                      count: 200,
                    }),
                  },
                })}
              />
              {errors.name?.message && (
                <div id='checkout-name-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.name.message}
                </div>
              )}
            </div>

            <div>
              <label htmlFor='checkout-phone' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('checkout.phone')}
              </label>
              <Input
                id='checkout-phone'
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
                placeholder='+1 555 555 555'
                {...register('phone', {
                  required: t('checkoutPage.validation.phoneRequired'),
                  minLength: {
                    value: 6,
                    message: t('checkoutPage.validation.minChars', {
                      count: 6,
                    }),
                  },
                  maxLength: {
                    value: 30,
                    message: t('checkoutPage.validation.maxChars', {
                      count: 30,
                    }),
                  },
                })}
              />
              {errors.phone?.message && (
                <div id='checkout-phone-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.phone.message}
                </div>
              )}
            </div>

            <div>
              <label className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-950/80'>
                <input
                  type='checkbox'
                  className='h-4 w-4'
                  {...register('delivery')}
                />
                {deliverySelected && quote
                  ? t('checkoutPage.delivery.addWithPrice', {
                      price: formatPrice(shippingPrice),
                    })
                  : t('checkoutPage.delivery.add')}
              </label>
            </div>

            {deliverySelected && shippingMethods.length > 0 && (
              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  {t('checkoutPage.delivery.method')}
                </label>
                <div className='space-y-2'>
                  {shippingMethods.map((method) => (
                    <label
                      key={method.handle}
                      className='flex cursor-pointer items-center gap-3 rounded-xl border border-white/50 bg-white/60 p-3 transition-colors hover:bg-white/80'
                    >
                      <input
                        type='radio'
                        name='shippingMethod'
                        className='h-4 w-4'
                        checked={selectedShippingMethod === method.handle}
                        onChange={() =>
                          setSelectedShippingMethod(method.handle)
                        }
                      />
                      <span className='min-w-0'>
                        <span className='flex flex-wrap items-center gap-2'>
                          <span className='text-sm font-bold text-indigo-950'>
                            {method.name}
                          </span>
                          <span className='text-sm font-bold text-indigo-950'>
                            {formatPrice(method.priceUsd)}
                          </span>
                          {method.estimatedDaysMin &&
                            method.estimatedDaysMax && (
                              <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800'>
                                {t('checkoutPage.delivery.days', {
                                  min: method.estimatedDaysMin,
                                  max: method.estimatedDaysMax,
                                })}
                              </span>
                            )}
                        </span>
                        {method.description && (
                          <span className='mt-1 block text-xs text-indigo-950/70'>
                            {method.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                {fetchingShippingMethods && (
                  <div className='mt-2 flex items-center gap-2 text-xs font-semibold text-indigo-950/70'>
                    <Loader2 className='h-3.5 w-3.5 animate-spin text-fuchsia-700' />
                    {t('checkoutPage.delivery.loading')}
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor='checkout-address' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('checkoutPage.form.streetAddress')}
              </label>
              <Input
                id='checkout-address'
                aria-invalid={errors.address ? true : undefined}
                aria-describedby={errors.address ? 'checkout-address-error' : undefined}
                placeholder={t('checkoutPage.form.streetPlaceholder')}
                {...register('address', {
                  validate: (v) =>
                    (typeof v === 'string' && v.trim().length >= 5) ||
                    t('checkoutPage.validation.addressRequired'),
                  maxLength: {
                    value: 300,
                    message: t('checkoutPage.validation.maxChars', {
                      count: 300,
                    }),
                  },
                })}
              />
              {errors.address?.message && (
                <div id='checkout-address-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.address.message}
                </div>
              )}
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div>
                <label htmlFor='checkout-city' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  {t('checkout.city')}
                </label>
                <Input
                  id='checkout-city'
                  aria-invalid={errors.city ? true : undefined}
                  aria-describedby={errors.city ? 'checkout-city-error' : undefined}
                  placeholder={t('checkout.city')}
                  {...register('city', {
                    validate: (v) =>
                      (typeof v === 'string' && v.trim().length >= 2) ||
                      t('checkoutPage.validation.cityRequired'),
                    maxLength: {
                      value: 100,
                      message: t('checkoutPage.validation.maxChars', {
                        count: 100,
                      }),
                    },
                  })}
                />
                {errors.city?.message && (
                  <div id='checkout-city-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                    {errors.city.message}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor='checkout-zip' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  {t('checkoutPage.form.zipLabel')}
                </label>
                <Input
                  id='checkout-zip'
                  aria-invalid={errors.zip ? true : undefined}
                  aria-describedby={errors.zip ? 'checkout-zip-error' : undefined}
                  placeholder={t('checkoutPage.form.zipPlaceholder')}
                  {...register('zip', {
                    validate: (v) =>
                      (typeof v === 'string' && v.trim().length >= 2) ||
                      t('checkoutPage.validation.zipRequired'),
                    maxLength: {
                      value: 20,
                      message: t('checkoutPage.validation.maxChars', {
                        count: 20,
                      }),
                    },
                  })}
                />
                {errors.zip?.message && (
                  <div id='checkout-zip-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                    {errors.zip.message}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor='checkout-country' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  {t('checkout.country')}
                </label>
                <Input
                  id='checkout-country'
                  aria-invalid={errors.country ? true : undefined}
                  aria-describedby={errors.country ? 'checkout-country-error' : undefined}
                  placeholder='US'
                  {...register('country', {
                    validate: (v) =>
                      (typeof v === 'string' && v.trim().length === 2) ||
                      t('checkoutPage.validation.countryCode'),
                    maxLength: {
                      value: 2,
                      message: t('checkoutPage.validation.maxChars', {
                        count: 2,
                      }),
                    },
                  })}
                />
                {errors.country?.message && (
                  <div id='checkout-country-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                    {errors.country.message}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor='checkout-notes' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('checkoutPage.form.notesLabel')}
              </label>
              <Input
                id='checkout-notes'
                placeholder={t('checkoutPage.form.notesPlaceholder')}
                {...register('notes', {
                  maxLength: {
                    value: 500,
                    message: t('checkoutPage.validation.maxChars', {
                      count: 500,
                    }),
                  },
                })}
              />
            </div>

            <Button
              type='submit'
              size='lg'
              disabled={
                isSubmitting || createOrder.isPending || stripeRedirecting
              }
              className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95'
            >
              {isSubmitting || createOrder.isPending || stripeRedirecting ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  {t('checkoutPage.form.submitting')}
                </span>
              ) : (
                t('checkoutPage.form.payNow')
              )}
            </Button>

            <ul className='space-y-2 text-xs font-semibold text-indigo-950/70'>
              <li className='flex items-center gap-2'>
                <ShieldCheck
                  className='h-3.5 w-3.5 shrink-0 text-fuchsia-700'
                  aria-hidden
                />
                {t('checkoutPage.trust.securePayment')}
              </li>
              <li className='flex items-center gap-2'>
                <Truck
                  className='h-3.5 w-3.5 shrink-0 text-fuchsia-700'
                  aria-hidden
                />
                {t('checkoutPage.trust.trackedShipping')}
              </li>
              <li className='flex items-center gap-2'>
                <RefreshCw
                  className='h-3.5 w-3.5 shrink-0 text-fuchsia-700'
                  aria-hidden
                />
                {t('checkoutPage.trust.easyReturns')}
              </li>
            </ul>
          </form>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'
        >
          <div className='flex items-center gap-2 text-sm font-extrabold text-indigo-950'>
            <ShoppingBag className='h-4 w-4 text-cyan-700' />
            {t('checkoutPage.summary.title')}
          </div>

          {removedNotices.length > 0 && (
            <div
              role='status'
              className='mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900'
            >
              <ul className='space-y-1'>
                {removedNotices.map(([key, n]) => (
                  <li key={key}>
                    {n.title}: {cartNoticeMessage(n, t)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className='mt-4 divide-y divide-indigo-900/10'>
            {items.map((item) => {
              const lineKey = getCartLineKey(item);
              const variantLabel = formatVariantLabel(item.variant, t);
              const notice = notices[lineKey];
              return (
                <li
                  key={lineKey}
                  className='flex items-start gap-3 py-2'
                >
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-extrabold text-indigo-950'>
                      {item.title}
                    </div>
                    {variantLabel && (
                      <div className='truncate text-xs font-semibold text-indigo-950/60'>
                        {variantLabel}
                      </div>
                    )}
                    <div className='text-xs font-semibold text-indigo-950/60'>
                      {t('checkoutPage.summary.qtyPrice', {
                        qty: item.qty,
                        price: formatPrice(item.price),
                      })}
                    </div>
                    {notice && (
                      <div
                        role='status'
                        className='mt-0.5 text-xs font-semibold text-amber-700'
                      >
                        {cartNoticeMessage(notice, t)}
                      </div>
                    )}
                  </div>
                  <div className='text-sm font-extrabold text-indigo-950'>
                    {formatPrice(item.price * item.qty)}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className='mt-4 space-y-3'>
            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/80'>
              <span>{t('checkoutPage.summary.items')}</span>
              <span>{items.length}</span>
            </div>
            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/80'>
              <span>{t('checkout.subtotal')}</span>
              <span>{formatPrice(itemsPrice)}</span>
            </div>

            {appliedCoupon && (
              <div className='flex items-center justify-between text-sm font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <Check className='h-4 w-4' />
                  <span>
                    {t('checkoutPage.summary.coupon', {
                      code: appliedCoupon.code,
                    })}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span>-{formatPrice(discountAmount)}</span>
                  <button
                    type='button'
                    onClick={handleRemoveCoupon}
                    aria-label={t('checkoutPage.summary.removeCoupon')}
                    className='text-gray-500 hover:text-red-600 transition-colors'
                  >
                    <X className='h-4 w-4' aria-hidden />
                  </button>
                </div>
              </div>
            )}
            {couponRejectedByServer && (
              <div className='text-xs font-semibold text-rose-700'>
                {quote?.couponMessage ||
                  t('checkoutPage.summary.couponNoLongerValid')}
              </div>
            )}

            {!appliedCoupon && (
              <div className='space-y-2'>
                <div className='flex gap-2'>
                  <Input
                    aria-label={t('checkoutPage.summary.couponPlaceholder')}
                    placeholder={t('checkoutPage.summary.couponPlaceholder')}
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    className='flex-1'
                    disabled={validatingCoupon}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                  >
                    {validatingCoupon
                      ? t('checkoutPage.summary.checking')
                      : t('checkoutPage.summary.apply')}
                  </Button>
                </div>
                {couponMutation.error && (
                  <div className='text-xs font-semibold text-rose-700'>
                    {getUserFacingErrorMessage(
                      couponMutation.error,
                      t('checkoutPage.summary.invalidCoupon'),
                      t,
                    )}
                  </div>
                )}
              </div>
            )}

            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
              <span>{t('checkout.shipping')}</span>
              <span>{formatPrice(shippingPrice)}</span>
            </div>
            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
              <span>{t('checkout.tax')}</span>
              <span>{formatPrice(taxPrice)}</span>
            </div>
            <div className='h-px bg-indigo-900/10' />
            <div className='flex items-center justify-between text-base font-extrabold text-indigo-950'>
              <span>{t('checkout.total')}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
