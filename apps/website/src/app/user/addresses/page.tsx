'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useForm } from 'react-hook-form';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  MAX_ADDRESSES,
} from '@/hooks/profile/addressesQuery';
import type { Address, AddressPayload } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';
import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui/Skeleton';
import {
  FIELD,
  FIELD_ERROR,
  FIELD_LABEL,
  PANEL,
  UserEmptyState,
  UserPageHeader,
} from '../UserPage';

const EMPTY_ADDRESS: AddressPayload = {
  label: 'Home',
  name: '',
  phone: '',
  address: '',
  city: '',
  zip: '',
  country: 'US',
  isDefault: false,
};

const ACTION_BASE =
  'inline-flex items-center gap-1.5 rounded-full bg-stone-200/60 px-3.5 py-2 text-xs font-semibold text-ink transition-colors duration-(--dur-fast) hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:pointer-events-none disabled:opacity-50';
const ACTION = `${ACTION_BASE} hover:bg-ink`;
const ACTION_DANGER = `${ACTION_BASE} hover:bg-rose-600`;

export default function AddressesPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const confirm = useConfirm();
  // `null` = no form open, 'new' = adding, otherwise the id being edited.
  const [formFor, setFormFor] = useState<string | null>(null);

  const addressesQuery = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const addresses = addressesQuery.data ?? [];
  const isAtLimit = addresses.length >= MAX_ADDRESSES;
  const saving = createAddress.isPending || updateAddress.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressPayload>({
    defaultValues: EMPTY_ADDRESS,
    mode: 'onTouched',
  });

  const openCreate = () => {
    reset(EMPTY_ADDRESS);
    setFormFor('new');
  };

  const openEdit = (addr: Address) => {
    reset({
      label: addr.label || 'Home',
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      zip: addr.zip,
      country: addr.country || 'US',
      isDefault: addr.isDefault,
    });
    setFormFor(addr._id);
  };

  const closeForm = () => {
    setFormFor(null);
    reset(EMPTY_ADDRESS);
  };

  const onSubmit = async (data: AddressPayload) => {
    if (formFor === 'new') {
      try {
        await createAddress.mutateAsync(data);
        toast(t('addresses.toast.added'), { variant: 'success' });
        closeForm();
      } catch {
        toast(t('addresses.toast.addFailed'), { variant: 'error' });
      }
      return;
    }
    if (!formFor) return;
    try {
      await updateAddress.mutateAsync({ addressId: formFor, payload: data });
      toast(t('addresses.toast.updated'), { variant: 'success' });
      closeForm();
    } catch {
      toast(t('addresses.toast.updateFailed'), { variant: 'error' });
    }
  };

  const handleDelete = (addr: Address) =>
    confirm({
      variant: 'danger',
      title: t('addresses.confirmDelete'),
      description: `${addr.address}, ${addr.city}`,
      confirmLabel: t('addresses.delete'),
      cancelLabel: t('confirmDialog.cancel'),
      onConfirm: async () => {
        try {
          await deleteAddress.mutateAsync(addr._id);
          toast(t('addresses.toast.deleted'), { variant: 'success' });
        } catch {
          toast(t('addresses.toast.deleteFailed'), { variant: 'error' });
        }
      },
    });

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress.mutateAsync(id);
      toast(t('addresses.toast.defaultUpdated'), { variant: 'success' });
    } catch {
      toast(t('addresses.toast.defaultFailed'), { variant: 'error' });
    }
  };

  // One form for both adding and editing; `formFor` decides which on submit.
  const form = (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className='text-heading text-ink'>
        {formFor === 'new'
          ? t('addresses.addNewAddress')
          : t('addresses.editAddress')}
      </h2>

      <div className='mt-5 grid gap-4 sm:grid-cols-2'>
        <div>
          <label htmlFor='addr-label' className={FIELD_LABEL}>
            {t('addresses.labelPlaceholder')}
          </label>
          <Input
            id='addr-label'
            className={FIELD}
            placeholder={t('addresses.labelPlaceholderExample')}
            {...register('label')}
          />
        </div>
        <div>
          <label htmlFor='addr-name' className={FIELD_LABEL}>
            {t('checkoutPage.form.fullName')}
          </label>
          <Input
            id='addr-name'
            className={FIELD}
            autoComplete='name'
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'addr-name-error' : undefined}
            {...register('name', {
              required: t('checkoutPage.validation.nameRequired'),
              minLength: {
                value: 2,
                message: t('addresses.validation.minChars', { count: 2 }),
              },
            })}
          />
          {errors.name && (
            <p id='addr-name-error' role='alert' className={FIELD_ERROR}>
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor='addr-phone' className={FIELD_LABEL}>
            {t('checkout.phone')}
          </label>
          <Input
            id='addr-phone'
            type='tel'
            dir='ltr'
            className={FIELD}
            autoComplete='tel'
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? 'addr-phone-error' : undefined}
            {...register('phone', {
              required: t('checkoutPage.validation.phoneRequired'),
              minLength: {
                value: 6,
                message: t('addresses.validation.minChars', { count: 6 }),
              },
            })}
          />
          {errors.phone && (
            <p id='addr-phone-error' role='alert' className={FIELD_ERROR}>
              {errors.phone.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor='addr-country' className={FIELD_LABEL}>
            {t('addresses.countryPlaceholder')}
          </label>
          <Input
            id='addr-country'
            className={`${FIELD} uppercase`}
            autoComplete='country'
            placeholder='US'
            aria-invalid={errors.country ? true : undefined}
            aria-describedby={errors.country ? 'addr-country-error' : undefined}
            {...register('country', {
              maxLength: {
                value: 2,
                message: t('addresses.validation.countryCode'),
              },
              minLength: {
                value: 2,
                message: t('addresses.validation.countryCode'),
              },
            })}
          />
          {errors.country && (
            <p id='addr-country-error' role='alert' className={FIELD_ERROR}>
              {errors.country.message}
            </p>
          )}
        </div>
        <div className='sm:col-span-2'>
          <label htmlFor='addr-address' className={FIELD_LABEL}>
            {t('checkoutPage.form.streetAddress')}
          </label>
          <Input
            id='addr-address'
            className={FIELD}
            autoComplete='street-address'
            placeholder={t('checkoutPage.form.streetPlaceholder')}
            aria-invalid={errors.address ? true : undefined}
            aria-describedby={errors.address ? 'addr-address-error' : undefined}
            {...register('address', {
              required: t('checkoutPage.validation.addressRequired'),
              minLength: {
                value: 5,
                message: t('addresses.validation.minChars', { count: 5 }),
              },
            })}
          />
          {errors.address && (
            <p id='addr-address-error' role='alert' className={FIELD_ERROR}>
              {errors.address.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor='addr-city' className={FIELD_LABEL}>
            {t('checkout.city')}
          </label>
          <Input
            id='addr-city'
            className={FIELD}
            autoComplete='address-level2'
            aria-invalid={errors.city ? true : undefined}
            aria-describedby={errors.city ? 'addr-city-error' : undefined}
            {...register('city', {
              required: t('checkoutPage.validation.cityRequired'),
              minLength: {
                value: 2,
                message: t('addresses.validation.minChars', { count: 2 }),
              },
            })}
          />
          {errors.city && (
            <p id='addr-city-error' role='alert' className={FIELD_ERROR}>
              {errors.city.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor='addr-zip' className={FIELD_LABEL}>
            {t('checkoutPage.form.zipLabel')}
          </label>
          <Input
            id='addr-zip'
            className={FIELD}
            autoComplete='postal-code'
            aria-invalid={errors.zip ? true : undefined}
            aria-describedby={errors.zip ? 'addr-zip-error' : undefined}
            {...register('zip', {
              required: t('checkoutPage.validation.zipRequired'),
              minLength: {
                value: 2,
                message: t('addresses.validation.minChars', { count: 2 }),
              },
            })}
          />
          {errors.zip && (
            <p id='addr-zip-error' role='alert' className={FIELD_ERROR}>
              {errors.zip.message}
            </p>
          )}
        </div>
      </div>

      <div className='mt-6 flex flex-wrap gap-3'>
        <Button
          type='submit'
          variant='solid'
          loading={saving}
          className='rounded-full px-7'
        >
          {formFor === 'new' ? t('addresses.save') : t('addresses.update')}
        </Button>
        <button
          type='button'
          onClick={closeForm}
          className='inline-flex h-12 items-center rounded-full bg-stone-200/60 px-6 text-sm font-semibold text-ink transition-colors hover:bg-stone-200'
        >
          {t('confirmDialog.cancel')}
        </button>
      </div>
    </form>
  );

  return (
    <div className='space-y-6'>
      <UserPageHeader
        title={t('addresses.title')}
        subtitle={t('addresses.subtitle', { max: MAX_ADDRESSES })}
        action={
          !isAtLimit && formFor === null ? (
            <Button
              variant='solid'
              size='sm'
              className='rounded-full px-5'
              onClick={openCreate}
            >
              <Plus className='h-4 w-4' aria-hidden />
              {t('addresses.addAddress')}
            </Button>
          ) : undefined
        }
      />

      {addressesQuery.isLoading && (
        <SkeletonGroup className='grid gap-x-12 gap-y-10 sm:grid-cols-2'>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} aria-hidden className={PANEL}>
              <Skeleton className='h-4 w-1/3' />
              <SkeletonText lines={3} className='mt-4' />
            </div>
          ))}
        </SkeletonGroup>
      )}

      {formFor === 'new' && !addressesQuery.isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={PANEL}
        >
          {form}
        </motion.div>
      )}

      {!addressesQuery.isLoading && addresses.length === 0 && formFor === null && (
        <UserEmptyState
          icon={<MapPin className='h-6 w-6' strokeWidth={1.5} aria-hidden />}
          title={t('addresses.emptyTitle')}
          description={t('addresses.emptyBody')}
          action={
            !isAtLimit ? (
              <Button
                variant='solid'
                className='rounded-full px-7'
                onClick={openCreate}
              >
                <Plus className='h-4 w-4' aria-hidden />
                {t('addresses.addAddress')}
              </Button>
            ) : undefined
          }
        />
      )}

      {!addressesQuery.isLoading && addresses.length > 0 && (
        <div className='grid gap-x-12 gap-y-10 sm:grid-cols-2'>
          {addresses.map((addr) => {
            const editing = formFor === addr._id;
            return (
              <motion.div
                key={addr._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`${PANEL} ${editing ? 'sm:col-span-2' : 'flex flex-col'}`}
              >
                {editing ? (
                  form
                ) : (
                  <>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-200/60 text-ink'>
                          <MapPin className='h-4 w-4' strokeWidth={1.5} aria-hidden />
                        </span>
                        <span className='truncate text-base font-semibold text-ink'>
                          {addr.label || t('checkoutPage.savedAddresses.home')}
                        </span>
                      </div>
                      {addr.isDefault && (
                        <span className='shrink-0 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white'>
                          {t('checkoutPage.savedAddresses.default')}
                        </span>
                      )}
                    </div>

                    <address className='mt-4 space-y-1 text-sm not-italic leading-relaxed text-ink-muted'>
                      <p className='font-medium text-ink'>{addr.name}</p>
                      <p>{addr.address}</p>
                      <p>
                        {addr.city}, {addr.zip} {addr.country}
                      </p>
                      <p dir='ltr' className='text-start'>
                        {addr.phone}
                      </p>
                    </address>

                    <div className='mt-auto flex flex-wrap gap-2 pt-5'>
                      {!addr.isDefault && (
                        <button
                          type='button'
                          className={ACTION}
                          onClick={() => handleSetDefault(addr._id)}
                          disabled={setDefaultAddress.isPending}
                        >
                          <Check className='h-3.5 w-3.5' aria-hidden />
                          {t('addresses.setDefault')}
                        </button>
                      )}
                      <button
                        type='button'
                        className={ACTION}
                        onClick={() => openEdit(addr)}
                        disabled={saving}
                      >
                        <Pencil className='h-3.5 w-3.5' aria-hidden />
                        {t('addresses.edit')}
                      </button>
                      <button
                        type='button'
                        className={ACTION_DANGER}
                        onClick={() => void handleDelete(addr)}
                        disabled={deleteAddress.isPending}
                      >
                        <Trash2 className='h-3.5 w-3.5' aria-hidden />
                        {t('addresses.delete')}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
