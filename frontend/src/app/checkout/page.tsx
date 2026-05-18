'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Loader2, Truck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useCart } from '@/lib/cartStore';
import axios from 'axios';
import { paymentsApi } from '@/lib/api';
import { useCreateOrderMutation } from '@/hooks/orders/ordersQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { getAuthToken } from '@/lib/authCookies';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

type CheckoutValues = {
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  notes: string;
  delivery: boolean;
};

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
  const cart = useCart();
  const createOrder = useCreateOrderMutation();
  const confirm = useConfirm();
  const [stripeRedirecting, setStripeRedirecting] = useState(false);

  const items = cart.state.items;
  const subtotal = cart.subtotal;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      city: '',
      zip: '',
      notes: '',
      delivery: false,
    },
    mode: 'onTouched',
  });

  const deliverySelected = Boolean(watch('delivery'));
  const shippingPrice = deliverySelected ? 5 : 0;
  const total = subtotal + shippingPrice;

  const runCheckout = async (values: CheckoutValues) => {
    const payload = {
      items: items.map((i) => ({ templateId: i.templateId, qty: i.qty })),
      shippingAddress: {
        name: values.name,
        phone: values.phone,
        address: values.address,
        city: values.city,
        zip: values.zip,
        notes: values.notes,
      },
      shippingPrice: values.delivery ? 5 : 0,
      taxPrice: 0,
    };

    try {
      setStripeRedirecting(true);

      let stripeReady = false;
      try {
        const status = await paymentsApi.getSetupStatus();
        stripeReady = Boolean(status?.ready);
      } catch {
        stripeReady = false;
      }

      if (stripeReady) {
        try {
          const session = await paymentsApi.createCheckoutSession(payload);
          if (session?.url) {
            window.location.assign(session.url);
            return;
          }
        } catch (stripeErr: unknown) {
          if (!isStripeUnavailableForFallback(stripeErr)) {
            logErrorForDev(stripeErr);
            const msg = getUserFacingErrorMessage(
              stripeErr,
              'Could not start checkout',
            );
            toast(msg, { title: 'Checkout failed', variant: 'error' });
            return;
          }
        }
      }

      const order = await createOrder.mutateAsync(payload);

      cart.clearCart();
      toast('Order created successfully.', {
        title: 'Success',
        variant: 'success',
      });
      router.push(`/orders/${order._id}`);
    } catch (err: unknown) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(err, 'Checkout failed');
      toast(msg, { title: 'Checkout failed', variant: 'error' });
    } finally {
      setStripeRedirecting(false);
    }
  };

  const onSubmit = handleSubmit((values) => {
    const token = getAuthToken();
    if (!token) {
      toast('Please log in to continue.', {
        title: 'Login required',
        variant: 'info',
      });
      router.push('/auth/login');
      return;
    }

    if (items.length === 0) {
      toast('Your cart is empty.', { title: 'Checkout', variant: 'error' });
      router.push('/');
      return;
    }

    void confirm({
      variant: 'payment',
      title: 'Continue to secure checkout?',
      description: `Your order total is $${total.toFixed(2)}. You’ll finish payment on the next secure step.`,
      confirmLabel: 'Continue to payment',
      cancelLabel: 'Review details',
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
          Checkout
        </div>
        <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
          Shipping details
        </h1>
        <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
          When card checkout is enabled, you&apos;ll complete payment on a secure
          Stripe page. If it&apos;s not set up yet, your order is placed directly
          after you confirm.
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
            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Full name
              </label>
              <Input
                placeholder='Your name'
                {...register('name', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Use at least 2 characters',
                  },
                  maxLength: {
                    value: 200,
                    message: 'Maximum 200 characters',
                  },
                })}
              />
              {errors.name?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.name.message}
                </div>
              )}
            </div>

            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Phone
              </label>
              <Input
                placeholder='+1 555 555 555'
                {...register('phone', {
                  required: 'Phone is required',
                  minLength: {
                    value: 6,
                    message: 'Use at least 6 characters',
                  },
                  maxLength: {
                    value: 30,
                    message: 'Maximum 30 characters',
                  },
                })}
              />
              {errors.phone?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.phone.message}
                </div>
              )}
            </div>

            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Address
              </label>
              <Input
                placeholder='Street, building, apartment'
                {...register('address', {
                  required: 'Address is required',
                  minLength: {
                    value: 5,
                    message: 'Use at least 5 characters',
                  },
                  maxLength: {
                    value: 300,
                    message: 'Maximum 300 characters',
                  },
                })}
              />
              {errors.address?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.address.message}
                </div>
              )}
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  City
                </label>
                <Input
                  placeholder='City'
                  {...register('city', {
                    required: 'City is required',
                    minLength: {
                      value: 2,
                      message: 'Use at least 2 characters',
                    },
                    maxLength: {
                      value: 100,
                      message: 'Maximum 100 characters',
                    },
                  })}
                />
                {errors.city?.message && (
                  <div className='mt-2 text-sm font-semibold text-rose-700'>
                    {errors.city.message}
                  </div>
                )}
              </div>
              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  ZIP
                </label>
                <Input
                  placeholder='ZIP'
                  {...register('zip', {
                    required: 'ZIP is required',
                    minLength: {
                      value: 2,
                      message: 'Use at least 2 characters',
                    },
                    maxLength: {
                      value: 20,
                      message: 'Maximum 20 characters',
                    },
                  })}
                />
                {errors.zip?.message && (
                  <div className='mt-2 text-sm font-semibold text-rose-700'>
                    {errors.zip.message}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Notes
              </label>
              <Input
                placeholder='Optional notes'
                {...register('notes', {
                  maxLength: {
                    value: 500,
                    message: 'Maximum 500 characters',
                  },
                })}
              />
            </div>

            <div>
              <label className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-950/80'>
                <input
                  type='checkbox'
                  className='h-4 w-4'
                  {...register('delivery')}
                />
                Add local delivery (optional)
              </label>
            </div>

            <Button
              type='submit'
              size='lg'
              disabled={
                isSubmitting ||
                createOrder.isPending ||
                stripeRedirecting
              }
              className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95'
            >
              {isSubmitting ||
              createOrder.isPending ||
              stripeRedirecting ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Continuing...
                </span>
              ) : (
                'Pay now'
              )}
            </Button>
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
            Order summary
          </div>

          <div className='mt-4 space-y-3'>
            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/80'>
              <span>Items</span>
              <span>{items.length}</span>
            </div>
            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/80'>
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
              <span>Shipping</span>
              <span>${shippingPrice.toFixed(2)}</span>
            </div>
            <div className='flex items-center justify-between text-sm font-semibold text-indigo-950/70'>
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className='h-px bg-indigo-900/10' />
            <div className='flex items-center justify-between text-base font-extrabold text-indigo-950'>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
