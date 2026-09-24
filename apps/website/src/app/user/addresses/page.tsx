'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, MapPin, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
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
import { getAuthToken } from '@/lib/authCookies';
import { useTranslation } from '@/contexts/TranslationContext';

export default function AddressesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const addressesQuery = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const addresses = addressesQuery.data ?? [];
  const isAtLimit = addresses.length >= MAX_ADDRESSES;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddressPayload>({
    defaultValues: {
      label: 'Home',
      name: '',
      phone: '',
      address: '',
      city: '',
      zip: '',
      country: 'US',
      isDefault: false,
    },
    mode: 'onTouched',
  });

  const onSubmitCreate = async (data: AddressPayload) => {
    try {
      await createAddress.mutateAsync(data);
      toast(t('addresses.toast.added'), { variant: 'success' });
      reset();
      setShowCreateForm(false);
    } catch (err) {
      toast(t('addresses.toast.addFailed'), { variant: 'error' });
    }
  };

  const onSubmitEdit = async (data: AddressPayload, id: string) => {
    try {
      await updateAddress.mutateAsync({ addressId: id, payload: data });
      toast(t('addresses.toast.updated'), { variant: 'success' });
      setEditingId(null);
    } catch (err) {
      toast(t('addresses.toast.updateFailed'), { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('addresses.confirmDelete'))) return;
    try {
      await deleteAddress.mutateAsync(id);
      toast(t('addresses.toast.deleted'), { variant: 'success' });
    } catch (err) {
      toast(t('addresses.toast.deleteFailed'), { variant: 'error' });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress.mutateAsync(id);
      toast(t('addresses.toast.defaultUpdated'), { variant: 'success' });
    } catch (err) {
      toast(t('addresses.toast.defaultFailed'), { variant: 'error' });
    }
  };

  const startEdit = (addr: Address) => {
    setEditingId(addr._id);
    setShowCreateForm(false);
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset();
  };

  if (!getAuthToken()) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'
      >
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
              <MapPin className='h-4 w-4 text-fuchsia-700' />
              {t('common.addresses')}
            </div>
            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
              {t('addresses.title')}
            </h1>
            <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
              {t('addresses.subtitle', { max: MAX_ADDRESSES })}
            </p>
          </div>
          {!isAtLimit && !showCreateForm && !editingId && (
            <Button
              size='sm'
              onClick={() => {
                reset();
                setShowCreateForm(true);
              }}
            >
              <Plus className='me-2 h-4 w-4' />
              {t('addresses.addAddress')}
            </Button>
          )}
        </div>
      </motion.div>

      {addressesQuery.isLoading && (
        <div role='status' aria-label={t('common.loading')} className='flex items-center justify-center py-12'>
          <div className='h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent' />
        </div>
      )}

      {!addressesQuery.isLoading && addresses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-3xl border border-white/30 bg-white/35 p-12 text-center shadow-sm backdrop-blur-xl'
        >
          <MapPin className='mx-auto h-12 w-12 text-indigo-950/30' />
          <h2 className='mt-4 text-xl font-bold text-indigo-950'>{t('addresses.emptyTitle')}</h2>
          <p className='mt-2 text-sm text-indigo-950/70'>
            {t('addresses.emptyBody')}
          </p>
          {!isAtLimit && (
            <Button
              className='mt-6'
              size='lg'
              onClick={() => {
                reset();
                setShowCreateForm(true);
              }}
            >
              <Plus className='me-2 h-4 w-4' />
              {t('addresses.addAddress')}
            </Button>
          )}
        </motion.div>
      )}

      {!addressesQuery.isLoading && addresses.length > 0 && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {addresses.map((addr) => (
            <motion.div
              key={addr._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className='relative rounded-3xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'
            >
              {addr.isDefault && (
                <span className='absolute -top-2 start-4 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'>
                  {t('checkoutPage.savedAddresses.default')}
                </span>
              )}

              {editingId === addr._id ? (
                <form onSubmit={handleSubmit((d) => onSubmitEdit(d, addr._id))} className='space-y-3'>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    <Input
                      id='addr-edit-label'
                      aria-label={t('addresses.labelPlaceholder')}
                      placeholder={t('addresses.labelPlaceholder')}
                      {...register('label')}
                      defaultValue={addr.label || 'Home'}
                    />
                    <Input
                      id='addr-edit-country'
                      aria-invalid={errors.country ? true : undefined}
                      aria-describedby={errors.country ? 'addr-edit-country-error' : undefined}
                      aria-label={t('addresses.countryPlaceholder')}
                      placeholder={t('addresses.countryPlaceholder')}
                      {...register('country', {
                        maxLength: { value: 2, message: t('addresses.validation.countryCode') },
                        minLength: { value: 2, message: t('addresses.validation.countryCode') },
                      })}
                      defaultValue={addr.country || 'US'}
                    />
                  </div>
                  {errors.country && (
                    <p id='addr-edit-country-error' role='alert' className='text-sm text-rose-600'>{errors.country.message}</p>
                  )}
                  <Input
                    id='addr-edit-name'
                    aria-label={t('checkoutPage.form.fullName')}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? 'addr-edit-name-error' : undefined}
                    placeholder={t('checkoutPage.form.fullName')}
                    {...register('name', { required: t('checkoutPage.validation.nameRequired') })}
                    defaultValue={addr.name}
                  />
                  {errors.name && (
                    <p id='addr-edit-name-error' role='alert' className='text-sm text-rose-600'>{errors.name.message}</p>
                  )}
                  <Input
                    id='addr-edit-phone'
                    aria-label={t('checkout.phone')}
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={errors.phone ? 'addr-edit-phone-error' : undefined}
                    placeholder={t('checkout.phone')}
                    {...register('phone', { required: t('checkoutPage.validation.phoneRequired') })}
                    defaultValue={addr.phone}
                  />
                  {errors.phone && (
                    <p id='addr-edit-phone-error' role='alert' className='text-sm text-rose-600'>{errors.phone.message}</p>
                  )}
                  <Input
                    id='addr-edit-address'
                    aria-label={t('checkoutPage.form.streetAddress')}
                    aria-invalid={errors.address ? true : undefined}
                    aria-describedby={errors.address ? 'addr-edit-address-error' : undefined}
                    placeholder={t('checkoutPage.form.streetAddress')}
                    {...register('address', { required: t('checkoutPage.validation.addressRequired') })}
                    defaultValue={addr.address}
                  />
                  {errors.address && (
                    <p id='addr-edit-address-error' role='alert' className='text-sm text-rose-600'>{errors.address.message}</p>
                  )}
                  <div className='grid gap-2 sm:grid-cols-2'>
                    <Input
                      id='addr-edit-city'
                      aria-label={t('checkout.city')}
                      aria-invalid={errors.city ? true : undefined}
                      aria-describedby={errors.city ? 'addr-edit-city-error' : undefined}
                      placeholder={t('checkout.city')}
                      {...register('city', { required: t('checkoutPage.validation.cityRequired') })}
                      defaultValue={addr.city}
                    />
                    <Input
                      id='addr-edit-zip'
                      aria-label={t('checkoutPage.form.zipLabel')}
                      aria-invalid={errors.zip ? true : undefined}
                      aria-describedby={errors.zip ? 'addr-edit-zip-error' : undefined}
                      placeholder={t('checkoutPage.form.zipPlaceholder')}
                      {...register('zip', { required: t('checkoutPage.validation.zipRequired') })}
                      defaultValue={addr.zip}
                    />
                  </div>
                  {errors.city && <p id='addr-edit-city-error' role='alert' className='text-sm text-rose-600'>{errors.city.message}</p>}
                  {errors.zip && <p id='addr-edit-zip-error' role='alert' className='text-sm text-rose-600'>{errors.zip.message}</p>}

                  <div className='flex gap-2'>
                    <Button type='submit' className='flex-1'>
                      {t('addresses.save')}
                    </Button>
                    <Button type='button' variant='outline' onClick={cancelEdit}>
                      {t('confirmDialog.cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <dl className='space-y-2 text-sm'>
                    <div className='flex items-center gap-2 text-indigo-950/80'>
                      <MapPin className='h-4 w-4' />
                      <span className='font-bold'>{addr.label || t('checkoutPage.savedAddresses.home')}</span>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>{t('addresses.name')}</dt>
                      <dd className='font-medium text-indigo-950'>{addr.name}</dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>{t('checkout.phone')}</dt>
                      <dd className='font-medium text-indigo-950'>{addr.phone}</dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>{t('checkout.address')}</dt>
                      <dd className='font-medium text-indigo-950'>{addr.address}</dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>{t('addresses.cityZipCountry')}</dt>
                      <dd className='font-medium text-indigo-950'>
                        {addr.city}, {addr.zip} {addr.country}
                      </dd>
                    </div>
                  </dl>

                  <div className='mt-4 flex flex-wrap gap-2'>
                    {!addr.isDefault && (
                      <Button
                        variant='outline'
                        size='sm'
                        className='flex-1 sm:flex-none'
                        onClick={() => handleSetDefault(addr._id)}
                        disabled={setDefaultAddress.isPending}
                      >
                        <Check className='me-1.5 h-3.5 w-3.5' />
                        {t('addresses.setDefault')}
                      </Button>
                    )}
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 sm:flex-none'
                      onClick={() => startEdit(addr)}
                      disabled={updateAddress.isPending}
                    >
                      <Edit className='me-1.5 h-3.5 w-3.5' />
                      {t('addresses.edit')}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 sm:flex-none text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/20'
                      onClick={() => handleDelete(addr._id)}
                      disabled={deleteAddress.isPending}
                    >
                      <Trash2 className='me-1.5 h-3.5 w-3.5' />
                      {t('addresses.delete')}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {(showCreateForm || editingId) && !addressesQuery.isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-3xl border border-white/30 bg-white/35 p-5 shadow-sm backdrop-blur-xl'
        >
          <form onSubmit={handleSubmit(onSubmitCreate)} className='space-y-3'>
            <h3 className='text-lg font-bold text-indigo-950'>
              {editingId ? t('addresses.editAddress') : t('addresses.addNewAddress')}
            </h3>

            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                id='addr-new-label'
                aria-label={t('addresses.labelPlaceholder')}
                placeholder={t('addresses.labelPlaceholderExample')}
                {...register('label')}
              />
              <Input
                id='addr-new-country'
                aria-invalid={errors.country ? true : undefined}
                aria-describedby={errors.country ? 'addr-new-country-error' : undefined}
                aria-label={t('addresses.countryPlaceholder')}
                placeholder={t('addresses.countryPlaceholderExample')}
                {...register('country', {
                  maxLength: { value: 2, message: t('addresses.validation.countryCode') },
                  minLength: { value: 2, message: t('addresses.validation.countryCode') },
                })}
              />
            </div>
            {errors.country && (
              <p id='addr-new-country-error' role='alert' className='text-sm text-rose-600'>{errors.country.message}</p>
            )}
            <Input
              id='addr-new-name'
              aria-label={t('checkoutPage.form.fullName')}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'addr-new-name-error' : undefined}
              placeholder={t('checkoutPage.form.fullName')}
              {...register('name', { required: t('checkoutPage.validation.nameRequired'), minLength: { value: 2, message: t('addresses.validation.minChars', { count: 2 }) } })}
            />
            {errors.name && <p id='addr-new-name-error' role='alert' className='text-sm text-rose-600'>{errors.name.message}</p>}

            <Input
              id='addr-new-phone'
              aria-label={t('checkout.phone')}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'addr-new-phone-error' : undefined}
              placeholder={t('checkout.phone')}
              {...register('phone', { required: t('checkoutPage.validation.phoneRequired'), minLength: { value: 6, message: t('addresses.validation.minChars', { count: 6 }) } })}
            />
            {errors.phone && <p id='addr-new-phone-error' role='alert' className='text-sm text-rose-600'>{errors.phone.message}</p>}

            <Input
              id='addr-new-address'
              aria-label={t('checkoutPage.form.streetAddress')}
              aria-invalid={errors.address ? true : undefined}
              aria-describedby={errors.address ? 'addr-new-address-error' : undefined}
              placeholder={t('checkoutPage.form.streetPlaceholder')}
              {...register('address', { required: t('checkoutPage.validation.addressRequired'), minLength: { value: 5, message: t('addresses.validation.minChars', { count: 5 }) } })}
            />
            {errors.address && <p id='addr-new-address-error' role='alert' className='text-sm text-rose-600'>{errors.address.message}</p>}

            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                id='addr-new-city'
                aria-label={t('checkout.city')}
                aria-invalid={errors.city ? true : undefined}
                aria-describedby={errors.city ? 'addr-new-city-error' : undefined}
                placeholder={t('checkout.city')}
                {...register('city', { required: t('checkoutPage.validation.cityRequired'), minLength: { value: 2, message: t('addresses.validation.minChars', { count: 2 }) } })}
              />
              <Input
                id='addr-new-zip'
                aria-label={t('checkoutPage.form.zipLabel')}
                aria-invalid={errors.zip ? true : undefined}
                aria-describedby={errors.zip ? 'addr-new-zip-error' : undefined}
                placeholder={t('addresses.zipPostalPlaceholder')}
                {...register('zip', { required: t('checkoutPage.validation.zipRequired'), minLength: { value: 2, message: t('addresses.validation.minChars', { count: 2 }) } })}
              />
            </div>
            {errors.city && <p id='addr-new-city-error' role='alert' className='text-sm text-rose-600'>{errors.city.message}</p>}
            {errors.zip && <p id='addr-new-zip-error' role='alert' className='text-sm text-rose-600'>{errors.zip.message}</p>}

            <div className='flex gap-2'>
              <Button type='submit' disabled={createAddress.isPending} className='flex-1'>
                {editingId ? t('addresses.update') : t('addresses.save')}
              </Button>
              <Button type='button' variant='outline' onClick={cancelEdit} className='flex-1'>
                {t('confirmDialog.cancel')}
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}