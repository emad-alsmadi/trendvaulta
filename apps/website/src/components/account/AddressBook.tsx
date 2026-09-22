'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import {
  MAX_ADDRESSES,
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from '@/hooks/profile/addressesQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import type { Address } from '@/types';

/**
 * Bounds mirror the checkout form's react-hook-form rules
 * (src/app/checkout/page.tsx) and the API's Joi validator
 * (apps/api/models/User.js) so both paths accept exactly the same input.
 * `notes` is per-order and is deliberately not part of a saved address.
 */
const addressSchema = z.object({
  label: z.string().trim().max(40, 'Maximum 40 characters'),
  name: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(200, 'Maximum 200 characters'),
  phone: z
    .string()
    .trim()
    .min(6, 'Use at least 6 characters')
    .max(30, 'Maximum 30 characters'),
  address: z
    .string()
    .trim()
    .min(5, 'Use at least 5 characters')
    .max(300, 'Maximum 300 characters'),
  city: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(100, 'Maximum 100 characters'),
  zip: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(20, 'Maximum 20 characters'),
  country: z.string().trim().max(100, 'Maximum 100 characters'),
  isDefault: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

const emptyAddress: AddressFormValues = {
  label: 'Home',
  name: '',
  phone: '',
  address: '',
  city: '',
  zip: '',
  country: '',
  isDefault: false,
};

/** `null` = form closed, `'new'` = adding, otherwise the address being edited. */
type EditorState = null | 'new' | Address;

export function AddressBook() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const addressesQuery = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const [editor, setEditor] = useState<EditorState>(null);
  // Tracked per row so only the pressed button shows a spinner.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null);

  const addresses = addressesQuery.data ?? [];
  const atCap = addresses.length >= MAX_ADDRESSES;

  const handleSetDefault = async (addr: Address) => {
    setPendingDefaultId(addr._id);
    try {
      await setDefaultAddress.mutateAsync(addr._id);
      toast('Default address updated', { variant: 'success' });
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not update the default address'), {
        title: 'Update failed',
        variant: 'error',
      });
    } finally {
      setPendingDefaultId(null);
    }
  };

  const handleDelete = (addr: Address) => {
    confirm({
      variant: 'danger',
      title: 'Delete this address?',
      description: `“${addr.label}” will be removed from your address book. This can't be undone.`,
      confirmLabel: 'Delete address',
      onConfirm: async () => {
        setPendingDeleteId(addr._id);
        try {
          await deleteAddress.mutateAsync(addr._id);
          // Close the editor if it was showing the row we just removed.
          setEditor((current) =>
            current && current !== 'new' && current._id === addr._id
              ? null
              : current,
          );
          toast('Address deleted', { variant: 'success' });
        } catch (err) {
          logErrorForDev(err);
          toast(getUserFacingErrorMessage(err, 'Could not delete the address'), {
            title: 'Delete failed',
            variant: 'error',
          });
        } finally {
          setPendingDeleteId(null);
        }
      },
    });
  };

  if (addressesQuery.isLoading) {
    return (
      <div className='animate-pulse space-y-3' aria-busy='true'>
        <div className='h-6 w-40 rounded bg-gray-200' />
        <div className='h-24 rounded-xl bg-gray-200' />
        <div className='h-24 rounded-xl bg-gray-200' />
      </div>
    );
  }

  if (addressesQuery.isError) {
    return (
      <div className='rounded-xl border border-rose-200 bg-rose-50 p-4'>
        <p className='text-sm font-semibold text-rose-800'>
          {getUserFacingErrorMessage(
            addressesQuery.error,
            'Could not load your saved addresses',
          )}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='mt-3'
          onClick={() => addressesQuery.refetch()}
          disabled={addressesQuery.isFetching}
        >
          {addressesQuery.isFetching && (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden />
          )}
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Saved addresses</h2>
          <p className='mt-1 text-sm text-gray-600'>
            {addresses.length} of {MAX_ADDRESSES} saved
            {atCap && ' — delete one to add another'}
          </p>
        </div>

        {editor === null && (
          <Button
            type='button'
            size='sm'
            onClick={() => setEditor('new')}
            disabled={atCap}
            className='gap-2'
          >
            <Plus className='h-4 w-4' aria-hidden />
            Add address
          </Button>
        )}
      </div>

      {editor === 'new' && (
        <AddressForm
          key='new'
          title='Add a new address'
          submitLabel='Save address'
          initial={{ ...emptyAddress, isDefault: addresses.length === 0 }}
          lockDefault={addresses.length === 0}
          isPending={createAddress.isPending}
          onCancel={() => setEditor(null)}
          onSubmit={async (values) => {
            try {
              await createAddress.mutateAsync(values);
              setEditor(null);
              toast('Address saved', { variant: 'success' });
            } catch (err) {
              logErrorForDev(err);
              toast(
                getUserFacingErrorMessage(err, 'Could not save the address'),
                { title: 'Save failed', variant: 'error' },
              );
            }
          }}
        />
      )}

      {addresses.length === 0 && editor === null && (
        <div className='rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center'>
          <MapPin className='mx-auto h-8 w-8 text-gray-400' aria-hidden />
          <p className='mt-3 text-sm font-semibold text-gray-900'>
            No saved addresses yet
          </p>
          <p className='mt-1 text-sm text-gray-600'>
            Save an address to reuse it at checkout.
          </p>
        </div>
      )}

      <ul className='space-y-3'>
        {addresses.map((addr) => {
          const isEditing = editor !== null && editor !== 'new' && editor._id === addr._id;

          if (isEditing) {
            return (
              <li key={addr._id}>
                <AddressForm
                  key={addr._id}
                  title='Edit address'
                  submitLabel='Save changes'
                  initial={{
                    label: addr.label || 'Home',
                    name: addr.name,
                    phone: addr.phone,
                    address: addr.address,
                    city: addr.city,
                    zip: addr.zip,
                    country: addr.country || '',
                    isDefault: addr.isDefault,
                  }}
                  // The last remaining default can't be unset: the server
                  // always keeps one address flagged.
                  lockDefault={addr.isDefault}
                  isPending={updateAddress.isPending}
                  onCancel={() => setEditor(null)}
                  onSubmit={async (values) => {
                    try {
                      await updateAddress.mutateAsync({
                        addressId: addr._id,
                        payload: values,
                      });
                      setEditor(null);
                      toast('Address updated', { variant: 'success' });
                    } catch (err) {
                      logErrorForDev(err);
                      toast(
                        getUserFacingErrorMessage(
                          err,
                          'Could not update the address',
                        ),
                        { title: 'Update failed', variant: 'error' },
                      );
                    }
                  }}
                />
              </li>
            );
          }

          return (
            <li
              key={addr._id}
              className='rounded-xl border border-gray-200 bg-white p-4'
            >
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-bold text-gray-900'>
                      {addr.label || 'Home'}
                    </span>
                    {addr.isDefault && (
                      <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800'>
                        <Star className='h-3 w-3' aria-hidden />
                        Default
                      </span>
                    )}
                  </div>
                  <p className='mt-2 text-sm font-semibold text-gray-900'>
                    {addr.name}
                  </p>
                  <p className='text-sm text-gray-600'>{addr.phone}</p>
                  <p className='mt-1 text-sm text-gray-600'>
                    {addr.address}, {addr.city} {addr.zip}
                    {addr.country ? `, ${addr.country}` : ''}
                  </p>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  {!addr.isDefault && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='gap-2'
                      onClick={() => handleSetDefault(addr)}
                      disabled={pendingDefaultId === addr._id}
                    >
                      {pendingDefaultId === addr._id ? (
                        <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                      ) : (
                        <Star className='h-4 w-4' aria-hidden />
                      )}
                      Set default
                    </Button>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='gap-2'
                    onClick={() => setEditor(addr)}
                  >
                    <Pencil className='h-4 w-4' aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type='button'
                    variant='destructive'
                    size='sm'
                    className='gap-2'
                    onClick={() => handleDelete(addr)}
                    disabled={pendingDeleteId === addr._id}
                  >
                    {pendingDeleteId === addr._id ? (
                      <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                    ) : (
                      <Trash2 className='h-4 w-4' aria-hidden />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AddressForm({
  title,
  submitLabel,
  initial,
  lockDefault,
  isPending,
  onSubmit,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  initial: AddressFormValues;
  /** True when this address must stay the default (first/only, or current). */
  lockDefault: boolean;
  isPending: boolean;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial,
    mode: 'onTouched',
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='rounded-xl border border-gray-200 bg-white p-4'
      noValidate
    >
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h3 className='text-sm font-bold text-gray-900'>{title}</h3>
        <button
          type='button'
          onClick={onCancel}
          disabled={isPending}
          className='rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50'
          aria-label='Close address form'
        >
          <X className='h-4 w-4' aria-hidden />
        </button>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field
          label='Label'
          error={errors.label?.message}
          input={
            <Input
              placeholder='Home, Work…'
              maxLength={40}
              disabled={isPending}
              {...register('label')}
            />
          }
        />
        <Field
          label='Full name'
          error={errors.name?.message}
          input={
            <Input
              placeholder='Your name'
              autoComplete='name'
              maxLength={200}
              disabled={isPending}
              {...register('name')}
            />
          }
        />
        <Field
          label='Phone'
          error={errors.phone?.message}
          input={
            <Input
              placeholder='Phone number'
              autoComplete='tel'
              maxLength={30}
              disabled={isPending}
              {...register('phone')}
            />
          }
        />
        <Field
          label='City'
          error={errors.city?.message}
          input={
            <Input
              placeholder='City'
              autoComplete='address-level2'
              maxLength={100}
              disabled={isPending}
              {...register('city')}
            />
          }
        />
        <div className='sm:col-span-2'>
          <Field
            label='Address'
            error={errors.address?.message}
            input={
              <Input
                placeholder='Street, building, apartment'
                autoComplete='street-address'
                maxLength={300}
                disabled={isPending}
                {...register('address')}
              />
            }
          />
        </div>
        <Field
          label='ZIP / Postal code'
          error={errors.zip?.message}
          input={
            <Input
              placeholder='ZIP'
              autoComplete='postal-code'
              maxLength={20}
              disabled={isPending}
              {...register('zip')}
            />
          }
        />
        <Field
          label='Country'
          error={errors.country?.message}
          input={
            <Input
              placeholder='Country (optional)'
              autoComplete='country-name'
              maxLength={100}
              disabled={isPending}
              {...register('country')}
            />
          }
        />
      </div>

      <label className='mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700'>
        <input
          type='checkbox'
          className='h-4 w-4 rounded border-gray-300'
          disabled={isPending || lockDefault}
          {...register('isDefault')}
        />
        Use as my default address
      </label>
      {lockDefault && (
        <p className='mt-1 text-xs text-gray-500'>
          Your address book always keeps one default.
        </p>
      )}

      <div className='mt-5 flex flex-wrap items-center gap-3'>
        <Button type='submit' size='sm' disabled={isPending} className='gap-2'>
          {isPending && (
            <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
          )}
          {submitLabel}
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div>
      <label className='mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500'>
        {label}
      </label>
      {input}
      {error && (
        <p className='mt-1 text-sm font-semibold text-rose-700'>{error}</p>
      )}
    </div>
  );
}

export default AddressBook;
