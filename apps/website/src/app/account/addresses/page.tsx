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

export default function AddressesPage() {
  const router = useRouter();
  const { toast } = useToast();
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
      toast('Address added successfully', { variant: 'success' });
      reset();
      setShowCreateForm(false);
    } catch (err) {
      toast('Failed to add address', { variant: 'error' });
    }
  };

  const onSubmitEdit = async (data: AddressPayload, id: string) => {
    try {
      await updateAddress.mutateAsync({ addressId: id, payload: data });
      toast('Address updated successfully', { variant: 'success' });
      setEditingId(null);
    } catch (err) {
      toast('Failed to update address', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await deleteAddress.mutateAsync(id);
      toast('Address deleted', { variant: 'success' });
    } catch (err) {
      toast('Failed to delete address', { variant: 'error' });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress.mutateAsync(id);
      toast('Default address updated', { variant: 'success' });
    } catch (err) {
      toast('Failed to set default', { variant: 'error' });
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
              Addresses
            </div>
            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
              Saved Addresses
            </h1>
            <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
              Manage your shipping addresses for faster checkout. Maximum{' '}
              {MAX_ADDRESSES} addresses.
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
              Add Address
            </Button>
          )}
        </div>
      </motion.div>

      {addressesQuery.isLoading && (
        <div className='flex items-center justify-center py-12'>
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
          <h2 className='mt-4 text-xl font-bold text-indigo-950'>No addresses yet</h2>
          <p className='mt-2 text-sm text-indigo-950/70'>
            Add your first address to speed up future checkouts.
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
              Add Address
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
                  Default
                </span>
              )}

              {editingId === addr._id ? (
                <form onSubmit={handleSubmit((d) => onSubmitEdit(d, addr._id))} className='space-y-3'>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    <Input
                      placeholder='Label'
                      {...register('label')}
                      defaultValue={addr.label || 'Home'}
                    />
                    <Input
                      placeholder='Country (ISO 2-letter)'
                      {...register('country', {
                        maxLength: { value: 2, message: 'Use 2-letter country code' },
                        minLength: { value: 2, message: 'Use 2-letter country code' },
                      })}
                      defaultValue={addr.country || 'US'}
                    />
                  </div>
                  <Input
                    placeholder='Full name'
                    {...register('name', { required: 'Name is required' })}
                    defaultValue={addr.name}
                  />
                  {errors.name && (
                    <p className='text-sm text-rose-600'>{errors.name.message}</p>
                  )}
                  <Input
                    placeholder='Phone'
                    {...register('phone', { required: 'Phone is required' })}
                    defaultValue={addr.phone}
                  />
                  {errors.phone && (
                    <p className='text-sm text-rose-600'>{errors.phone.message}</p>
                  )}
                  <Input
                    placeholder='Street address'
                    {...register('address', { required: 'Address is required' })}
                    defaultValue={addr.address}
                  />
                  {errors.address && (
                    <p className='text-sm text-rose-600'>{errors.address.message}</p>
                  )}
                  <div className='grid gap-2 sm:grid-cols-2'>
                    <Input
                      placeholder='City'
                      {...register('city', { required: 'City is required' })}
                      defaultValue={addr.city}
                    />
                    <Input
                      placeholder='ZIP'
                      {...register('zip', { required: 'ZIP is required' })}
                      defaultValue={addr.zip}
                    />
                  </div>
                  {errors.city && <p className='text-sm text-rose-600'>{errors.city.message}</p>}
                  {errors.zip && <p className='text-sm text-rose-600'>{errors.zip.message}</p>}

                  <div className='flex gap-2'>
                    <Button type='submit' className='flex-1'>
                      Save
                    </Button>
                    <Button type='button' variant='outline' onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <dl className='space-y-2 text-sm'>
                    <div className='flex items-center gap-2 text-indigo-950/80'>
                      <MapPin className='h-4 w-4' />
                      <span className='font-bold'>{addr.label || 'Home'}</span>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>Name</dt>
                      <dd className='font-medium text-indigo-950'>{addr.name}</dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>Phone</dt>
                      <dd className='font-medium text-indigo-950'>{addr.phone}</dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>Address</dt>
                      <dd className='font-medium text-indigo-950'>{addr.address}</dd>
                    </div>
                    <div>
                      <dt className='text-indigo-950/50'>City / ZIP / Country</dt>
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
                        Set Default
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
                      Edit
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 sm:flex-none text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/20'
                      onClick={() => handleDelete(addr._id)}
                      disabled={deleteAddress.isPending}
                    >
                      <Trash2 className='me-1.5 h-3.5 w-3.5' />
                      Delete
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
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>

            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                placeholder='Label (e.g., Home, Work)'
                {...register('label')}
              />
              <Input
                placeholder='Country (ISO 2-letter, e.g., US)'
                {...register('country', {
                  maxLength: { value: 2, message: 'Use 2-letter country code' },
                  minLength: { value: 2, message: 'Use 2-letter country code' },
                })}
              />
            </div>
            <Input
              placeholder='Full name'
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
            />
            {errors.name && <p className='text-sm text-rose-600'>{errors.name.message}</p>}

            <Input
              placeholder='Phone'
              {...register('phone', { required: 'Phone is required', minLength: { value: 6, message: 'At least 6 characters' } })}
            />
            {errors.phone && <p className='text-sm text-rose-600'>{errors.phone.message}</p>}

            <Input
              placeholder='Street, building, apartment'
              {...register('address', { required: 'Address is required', minLength: { value: 5, message: 'At least 5 characters' } })}
            />
            {errors.address && <p className='text-sm text-rose-600'>{errors.address.message}</p>}

            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                placeholder='City'
                {...register('city', { required: 'City is required', minLength: { value: 2, message: 'At least 2 characters' } })}
              />
              <Input
                placeholder='ZIP / Postal Code'
                {...register('zip', { required: 'ZIP is required', minLength: { value: 2, message: 'At least 2 characters' } })}
              />
            </div>
            {errors.city && <p className='text-sm text-rose-600'>{errors.city.message}</p>}
            {errors.zip && <p className='text-sm text-rose-600'>{errors.zip.message}</p>}

            <div className='flex gap-2'>
              <Button type='submit' disabled={createAddress.isPending} className='flex-1'>
                {editingId ? 'Update' : 'Save'}
              </Button>
              <Button type='button' variant='outline' onClick={cancelEdit} className='flex-1'>
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}