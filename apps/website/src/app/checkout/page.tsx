'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  ArrowLeft,
  Loader2,
  Lock,
  Truck,
  X,
  Check,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
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
import Link from 'next/link';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';
import { rememberGuestToken } from '@/lib/guestOrder';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useAddresses, useCreateAddress } from '@/hooks/profile/addressesQuery';
import type { Address, CouponValidationResponse } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

type AppliedCoupon = NonNullable<CouponValidationResponse['coupon']>;

/** Radio value for "enter a new address" (saved ones use their id). */
const NEW_ADDRESS = 'new';

const SECTION = 'rounded-card border border-line bg-surface p-5 sm:p-6';
const FIELD_LABEL = 'mb-1.5 block text-sm font-medium text-ink';
const FIELD_ERROR = 'mt-1.5 text-xs font-medium text-rose-700';
/** Selectable row (address, shipping method): the border darkens when checked. */
const CHOICE =
  'flex cursor-pointer gap-3 rounded-control border border-line p-4 transition-colors duration-(--dur-fast) hover:border-ink-subtle has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-surface-sunken';

type CheckoutValues = {
  /** Guest checkout only (no session). */
  email?: string;
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
  const { t, formatPrice, locale } = useTranslation();
  const cart = useCart();
  const createOrder = useCreateOrderMutation();
  const confirm = useConfirm();
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  // Guests check out with an email instead of an account (plan P0-03, D2)
  const isGuest = !useHasAuthToken();
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
  const { query: quoteQuery, quote, notices } = useCartQuoteSync({
    items,
    couponCode: appliedCoupon?.code,
    delivery: deliverySelected,
    shippingMethod,
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
  // Lines added without a size/colour quote at $0 and the server rejects
  // them; hold the submit until the shopper picks one (the line says so).
  const needsVariantChoice = Object.values(notices).some(
    (n) => n.code === 'variant_required',
  );
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
      // No zone match leaves selectedShippingMethod '' — the API rejects ''.
      shippingMethod: values.delivery
        ? ((selectedShippingMethod || 'standard') as 'standard' | 'express')
        : ('none' as const),
      couponCode:
        appliedCoupon && !couponRejectedByServer
          ? appliedCoupon.code
          : undefined,
      ...(isGuest && values.email ? { email: values.email.trim() } : {}),
      // A guest's order emails come in the language they shopped in (P1-02)
      locale,
    };

    // Best-effort: save a brand-new address to the book before we leave for
    // Stripe (or complete the dev-mode order below). Never blocks checkout —
    // a failed save is silent since the order itself is what matters here.
    // Guests have no address book.
    if (!isGuest && selectedAddressId === null && saveNewAddress) {
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
          // The success page confirms a guest's payment with this token
          if (session?.guestToken) rememberGuestToken(session.orderId, session.guestToken);
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
              stripeErr.response?.data?.code === 'OUT_OF_STOCK'
            ) {
              // Someone else just took the last units. A fresh quote caps or
              // flags the affected line, so the shopper sees which one.
              void quoteQuery.refetch();
              toast(t('checkoutPage.toast.outOfStock'), {
                title: t('checkoutPage.toast.outOfStockTitle'),
                variant: 'error',
              });
            } else if (
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

      // Dev-only direct orders (no Stripe) still need an account
      if (isGuest) {
        toast(t('checkoutPage.toast.loginToContinue'), {
          title: t('checkoutPage.toast.loginRequiredTitle'),
          variant: 'info',
        });
        router.push('/auth/login?redirect=/checkout');
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

  const submitting =
    isSubmitting || createOrder.isPending || stripeRedirecting;

  return (
    <div className='mx-auto max-w-[1200px] space-y-8'>
      <header className='border-b border-line pb-6'>
        <Link
          href='/cart'
          className='inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink'
        >
          <ArrowLeft className='h-3.5 w-3.5 rtl:-scale-x-100' aria-hidden />
          {t('orderResult.cancel.backToCart')}
        </Link>
        <div className='mt-3 flex flex-wrap items-end justify-between gap-3'>
          <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-title'>
            {t('checkoutPage.title')}
          </h1>
          <p className='inline-flex items-center gap-1.5 text-xs text-ink-muted'>
            <Lock className='h-3.5 w-3.5' aria-hidden />
            {t('checkoutPage.trust.securePayment')}
          </p>
        </div>
      </header>

      <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]'>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className='min-w-0'
        >
          <form onSubmit={onSubmit} className='space-y-5'>
            {/* 1 — Contact */}
            <section className={SECTION}>
              <StepHeading step={1}>
                {t('checkoutPage.sections.contact')}
              </StepHeading>

              <div className='mt-5 space-y-4'>
                {isGuest && (
                  <div>
                    <label htmlFor='checkout-email' className={FIELD_LABEL}>
                      {t('checkoutPage.guest.email')}
                    </label>
                    <Input
                      id='checkout-email'
                      type='email'
                      autoComplete='email'
                      inputMode='email'
                      dir='ltr'
                      className='h-11'
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? 'checkout-email-error' : 'checkout-email-help'}
                      placeholder='you@example.com'
                      {...register('email', {
                        required: t('checkoutPage.guest.emailRequired'),
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: t('checkoutPage.guest.emailInvalid'),
                        },
                        maxLength: {
                          value: 100,
                          message: t('checkoutPage.validation.maxChars', { count: 100 }),
                        },
                      })}
                    />
                    {errors.email?.message ? (
                      <div id='checkout-email-error' role='alert' className={FIELD_ERROR}>
                        {errors.email.message}
                      </div>
                    ) : (
                      <p id='checkout-email-help' className='mt-1.5 text-xs text-ink-muted'>
                        {t('checkoutPage.guest.emailHelp')}
                      </p>
                    )}
                    <p className='mt-2 text-sm text-ink-muted'>
                      {t('checkoutPage.guest.haveAccount')}{' '}
                      <Link
                        href='/auth/login?redirect=/checkout'
                        className='font-semibold text-ink underline underline-offset-4 hover:text-accent'
                      >
                        {t('checkoutPage.guest.signIn')}
                      </Link>
                    </p>
                  </div>
                )}

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <label htmlFor='checkout-name' className={FIELD_LABEL}>
                      {t('checkoutPage.form.fullName')}
                    </label>
                    <Input
                      id='checkout-name'
                      autoComplete='name'
                      className='h-11'
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
                      <div id='checkout-name-error' role='alert' className={FIELD_ERROR}>
                        {errors.name.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor='checkout-phone' className={FIELD_LABEL}>
                      {t('checkout.phone')}
                    </label>
                    <Input
                      id='checkout-phone'
                      type='tel'
                      autoComplete='tel'
                      dir='ltr'
                      className='h-11'
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
                      <div id='checkout-phone-error' role='alert' className={FIELD_ERROR}>
                        {errors.phone.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 2 — Shipping address */}
            <section className={SECTION}>
              <StepHeading step={2}>
                {t('checkoutPage.sections.address')}
              </StepHeading>

              <div className='mt-5 space-y-4'>
                {savedAddresses.length > 0 && (
                  <RadioGroup
                    className='grid gap-2 sm:grid-cols-2'
                    aria-label={t('checkoutPage.savedAddresses.title')}
                    value={selectedAddressId ?? NEW_ADDRESS}
                    onValueChange={(value) => {
                      const addr = savedAddresses.find((a) => a._id === value);
                      if (addr) handleSelectSavedAddress(addr);
                      else handleUseNewAddress();
                    }}
                  >
                    {savedAddresses.map((addr) => (
                      <label key={addr._id} className={`${CHOICE} items-start`}>
                        <RadioGroupItem value={addr._id} className='mt-0.5' />
                        <span className='min-w-0'>
                          <span className='flex flex-wrap items-center gap-2'>
                            <span className='text-sm font-semibold text-ink'>
                              {addr.label || t('checkoutPage.savedAddresses.home')}
                            </span>
                            {addr.isDefault && (
                              <span className='rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted'>
                                {t('checkoutPage.savedAddresses.default')}
                              </span>
                            )}
                          </span>
                          <span className='mt-1 block text-sm text-ink-muted'>
                            {addr.name} · <span dir='ltr'>{addr.phone}</span>
                          </span>
                          <span className='block text-sm text-ink-muted'>
                            {addr.address}, {addr.city} {addr.zip}
                            {addr.country ? `, ${addr.country}` : ''}
                          </span>
                        </span>
                      </label>
                    ))}

                    <label className={`${CHOICE} items-center`}>
                      <RadioGroupItem value={NEW_ADDRESS} />
                      <span className='text-sm font-semibold text-ink'>
                        {t('checkoutPage.savedAddresses.useNew')}
                      </span>
                    </label>
                  </RadioGroup>
                )}

                <div>
                  <label htmlFor='checkout-address' className={FIELD_LABEL}>
                    {t('checkoutPage.form.streetAddress')}
                  </label>
                  <Input
                    id='checkout-address'
                    autoComplete='street-address'
                    className='h-11'
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
                    <div id='checkout-address-error' role='alert' className={FIELD_ERROR}>
                      {errors.address.message}
                    </div>
                  )}
                </div>

                <div className='grid gap-4 sm:grid-cols-3'>
                  <div>
                    <label htmlFor='checkout-city' className={FIELD_LABEL}>
                      {t('checkout.city')}
                    </label>
                    <Input
                      id='checkout-city'
                      autoComplete='address-level2'
                      className='h-11'
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
                      <div id='checkout-city-error' role='alert' className={FIELD_ERROR}>
                        {errors.city.message}
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor='checkout-zip' className={FIELD_LABEL}>
                      {t('checkoutPage.form.zipLabel')}
                    </label>
                    <Input
                      id='checkout-zip'
                      autoComplete='postal-code'
                      className='h-11'
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
                      <div id='checkout-zip-error' role='alert' className={FIELD_ERROR}>
                        {errors.zip.message}
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor='checkout-country' className={FIELD_LABEL}>
                      {t('checkout.country')}
                    </label>
                    <Input
                      id='checkout-country'
                      autoComplete='country'
                      className='h-11 uppercase'
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
                      <div id='checkout-country-error' role='alert' className={FIELD_ERROR}>
                        {errors.country.message}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor='checkout-notes' className={FIELD_LABEL}>
                    {t('checkoutPage.form.notesLabel')}
                  </label>
                  <Input
                    id='checkout-notes'
                    className='h-11'
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
              </div>
            </section>

            {/* 3 — Delivery */}
            <section className={SECTION}>
              <StepHeading step={3}>
                {t('checkoutPage.sections.delivery')}
              </StepHeading>

              <div className='mt-5 space-y-4'>
                <label className={`${CHOICE} items-center`}>
                  <Checkbox
                    checked={deliverySelected}
                    onCheckedChange={(checked) =>
                      setValue('delivery', checked === true, { shouldDirty: true })
                    }
                  />
                  <Truck
                    className='h-5 w-5 shrink-0 text-ink'
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className='text-sm font-semibold text-ink'>
                    {deliverySelected && quote
                      ? t('checkoutPage.delivery.addWithPrice', {
                          price: formatPrice(shippingPrice),
                        })
                      : t('checkoutPage.delivery.add')}
                  </span>
                </label>

                {deliverySelected && shippingMethods.length > 0 && (
                  <div>
                    <div className={FIELD_LABEL}>
                      {t('checkoutPage.delivery.method')}
                    </div>
                    <RadioGroup
                      className='space-y-2'
                      aria-label={t('checkoutPage.delivery.method')}
                      value={selectedShippingMethod ?? ''}
                      onValueChange={setSelectedShippingMethod}
                    >
                      {shippingMethods.map((method) => (
                        <label
                          key={method.handle}
                          className={`${CHOICE} items-center`}
                        >
                          <RadioGroupItem value={method.handle} />
                          <span className='min-w-0 flex-1'>
                            <span className='flex flex-wrap items-center gap-2'>
                              <span className='text-sm font-semibold text-ink'>
                                {method.name}
                              </span>
                              {method.estimatedDaysMin &&
                                method.estimatedDaysMax && (
                                  <span className='rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted'>
                                    {t('checkoutPage.delivery.days', {
                                      min: method.estimatedDaysMin,
                                      max: method.estimatedDaysMax,
                                    })}
                                  </span>
                                )}
                            </span>
                            {method.description && (
                              <span className='mt-0.5 block text-xs text-ink-muted'>
                                {method.description}
                              </span>
                            )}
                          </span>
                          <span className='shrink-0 text-sm font-semibold tabular-nums text-ink'>
                            {formatPrice(method.priceUsd)}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}
                {deliverySelected && fetchingShippingMethods && (
                  <div className='flex items-center gap-2 text-xs text-ink-muted'>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden />
                    {t('checkoutPage.delivery.loading')}
                  </div>
                )}
              </div>
            </section>

            {/* 4 — Payment */}
            <section className={SECTION}>
              <StepHeading step={4}>
                {t('checkoutPage.sections.payment')}
              </StepHeading>
              <p className='mt-4 text-sm leading-relaxed text-ink-muted'>
                {t('checkoutPage.intro')}
              </p>

              <Button
                type='submit'
                variant='solid'
                size='lg'
                disabled={submitting || needsVariantChoice}
                className='mt-5 w-full'
              >
                {submitting ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                    {t('checkoutPage.form.submitting')}
                  </>
                ) : (
                  <>
                    <Lock className='h-4 w-4' aria-hidden />
                    {t('checkoutPage.form.payNow')}
                    <span className='ms-1 border-s border-white/30 ps-3 tabular-nums'>
                      {formatPrice(total)}
                    </span>
                  </>
                )}
              </Button>

              <ul className='mt-5 grid gap-2.5 text-xs text-ink-muted sm:grid-cols-3'>
                <li className='flex items-center gap-2'>
                  <ShieldCheck className='h-4 w-4 shrink-0 text-ink' strokeWidth={1.5} aria-hidden />
                  {t('checkoutPage.trust.securePayment')}
                </li>
                <li className='flex items-center gap-2'>
                  <Truck className='h-4 w-4 shrink-0 text-ink' strokeWidth={1.5} aria-hidden />
                  {t('checkoutPage.trust.trackedShipping')}
                </li>
                <li className='flex items-center gap-2'>
                  <RefreshCw className='h-4 w-4 shrink-0 text-ink' strokeWidth={1.5} aria-hidden />
                  {t('checkoutPage.trust.easyReturns')}
                </li>
              </ul>
            </section>
          </form>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          // On phones the summary comes first, so the shopper sees what they
          // are paying for before the form; on desktop it sits beside it.
          className='order-first rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6 lg:sticky lg:top-24 lg:order-none lg:self-start'
        >
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-heading text-ink'>
              {t('checkoutPage.summary.title')}
            </h2>
            <span className='text-sm tabular-nums text-ink-muted'>
              {t('checkoutPage.summary.items')}: {items.length}
            </span>
          </div>

          {removedNotices.length > 0 && (
            <div
              role='status'
              className='mt-4 rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
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

          <ul className='mt-4 divide-y divide-line border-y border-line'>
            {items.map((item) => {
              const lineKey = getCartLineKey(item);
              const variantLabel = formatVariantLabel(item.variant, t);
              const notice = notices[lineKey];
              return (
                <li key={lineKey} className='flex items-start gap-3 py-4'>
                  <div className='relative h-16 w-14 shrink-0'>
                    <div className='relative h-full w-full overflow-hidden rounded-control bg-surface-muted'>
                      <Image
                        loader={remoteCoverLoader}
                        src={normalizeRemoteImageSrc(item.cover)}
                        alt=''
                        fill
                        className='object-cover'
                        sizes='56px'
                      />
                    </div>
                    <span className='absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.6875rem] font-semibold tabular-nums text-white'>
                      {item.qty}
                    </span>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='line-clamp-2 text-sm font-semibold text-ink'>
                      {item.title}
                    </div>
                    {variantLabel && (
                      <div className='mt-0.5 truncate text-xs text-ink-muted'>
                        {variantLabel}
                      </div>
                    )}
                    <div className='mt-0.5 text-xs tabular-nums text-ink-muted'>
                      {t('checkoutPage.summary.qtyPrice', {
                        qty: item.qty,
                        price: formatPrice(item.price),
                      })}
                    </div>
                    {notice && (
                      <div
                        role='status'
                        className='mt-1 text-xs font-medium text-amber-700'
                      >
                        {cartNoticeMessage(notice, t)}
                      </div>
                    )}
                  </div>
                  <div className='shrink-0 text-sm font-semibold tabular-nums text-ink'>
                    {formatPrice(item.price * item.qty)}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Coupon */}
          <div className='mt-4'>
            {appliedCoupon ? (
              <div className='flex items-center justify-between gap-3 rounded-control bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800'>
                <div className='flex min-w-0 items-center gap-2'>
                  <Check className='h-4 w-4 shrink-0' aria-hidden />
                  <span className='truncate'>
                    {t('checkoutPage.summary.coupon', {
                      code: appliedCoupon.code,
                    })}
                  </span>
                </div>
                <button
                  type='button'
                  onClick={handleRemoveCoupon}
                  aria-label={t('checkoutPage.summary.removeCoupon')}
                  className='shrink-0 text-emerald-800/70 transition-colors hover:text-rose-700'
                >
                  <X className='h-4 w-4' aria-hidden />
                </button>
              </div>
            ) : (
              <div className='space-y-2'>
                <div className='flex gap-2'>
                  <Input
                    aria-label={t('checkoutPage.summary.couponPlaceholder')}
                    placeholder={t('checkoutPage.summary.couponPlaceholder')}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className='flex-1'
                    disabled={validatingCoupon}
                  />
                  <Button
                    type='button'
                    variant='line'
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
                  <div className='text-xs font-medium text-rose-700'>
                    {getUserFacingErrorMessage(
                      couponMutation.error,
                      t('checkoutPage.summary.invalidCoupon'),
                      t,
                    )}
                  </div>
                )}
              </div>
            )}
            {couponRejectedByServer && (
              <div className='mt-2 text-xs font-medium text-rose-700'>
                {quote?.couponMessage ||
                  t('checkoutPage.summary.couponNoLongerValid')}
              </div>
            )}
          </div>

          <dl className='mt-5 space-y-3 text-sm'>
            <div className='flex items-center justify-between text-ink-muted'>
              <dt>{t('checkout.subtotal')}</dt>
              <dd className='tabular-nums text-ink'>{formatPrice(itemsPrice)}</dd>
            </div>
            {appliedCoupon && (
              <div className='flex items-center justify-between text-emerald-700'>
                <dt>{t('cartPage.discount')}</dt>
                <dd className='tabular-nums'>-{formatPrice(discountAmount)}</dd>
              </div>
            )}
            <div className='flex items-center justify-between text-ink-muted'>
              <dt>{t('checkout.shipping')}</dt>
              <dd className='tabular-nums text-ink'>
                {formatPrice(shippingPrice)}
              </dd>
            </div>
            <div className='flex items-center justify-between text-ink-muted'>
              <dt>{t('checkout.tax')}</dt>
              <dd className='tabular-nums text-ink'>{formatPrice(taxPrice)}</dd>
            </div>
            <div className='flex items-baseline justify-between border-t border-line pt-4 text-ink'>
              <dt className='text-base font-semibold'>{t('checkout.total')}</dt>
              <dd className='text-2xl font-semibold tabular-nums tracking-tight'>
                {formatPrice(total)}
              </dd>
            </div>
          </dl>
        </motion.aside>
      </div>
    </div>
  );
}

function StepHeading({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className='flex items-center gap-3'>
      <span
        aria-hidden
        className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold tabular-nums text-white'
      >
        {step}
      </span>
      <h2 className='text-heading text-ink'>{children}</h2>
    </div>
  );
}
