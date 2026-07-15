'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  useAdminCoupons,
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useUpdateCouponMutation,
} from '@/hooks/admin/adminQuery';
import type { Coupon, CouponPayload } from '@/types';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import {
  AdminError,
  AdminField,
  AdminInput,
  AdminLoading,
  AdminModal,
  AdminPanel,
  AdminRowActions,
  AdminSelect,
  AdminTable,
  AdminTextarea,
} from './admin-ui';

const emptyForm: CouponPayload = {
  code: '',
  discountType: 'percentage',
  discountValue: 0,
  expirationDate: '',
  usageLimit: null,
  minimumOrderAmount: 0,
  isActive: true,
  description: '',
};

export function AdminCouponsPanel() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const couponsQ = useAdminCoupons();
  const createMut = useCreateCouponMutation();
  const updateMut = useUpdateCouponMutation();
  const deleteMut = useDeleteCouponMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponPayload>(emptyForm);

  const coupons = couponsQ.data?.data || [];

  const modalTitle = editing ? 'Edit coupon' : 'Create coupon';
  const saving = createMut.isPending || updateMut.isPending;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      expirationDate: coupon.expirationDate,
      usageLimit: coupon.usageLimit,
      minimumOrderAmount: coupon.minimumOrderAmount,
      isActive: coupon.isActive,
      description: coupon.description || '',
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
  }

  async function handleSubmit() {
    if (!form.code.trim() || !form.discountValue || !form.expirationDate) {
      toast('Code, discount value, and expiration date are required.', {
        title: 'Validation',
        variant: 'error',
      });
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload: form });
        toast('Coupon updated successfully', {
          title: 'Saved',
          variant: 'success',
        });
      } else {
        await createMut.mutateAsync(form);
        toast('Coupon created successfully', {
          title: 'Created',
          variant: 'success',
        });
      }
      closeModal();
      setForm(emptyForm);
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not save coupon'), {
        title: 'Error',
        variant: 'error',
      });
    }
  }

  function handleDelete(coupon: Coupon) {
    void confirm({
      variant: 'danger',
      title: 'Delete this coupon?',
      description: `"${coupon.code}" will be removed permanently.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(coupon._id);
          toast('Coupon deleted successfully', {
            title: 'Deleted',
            variant: 'success',
          });
        } catch (err) {
          logErrorForDev(err);
          toast(getUserFacingErrorMessage(err, 'Could not delete coupon'), {
            title: 'Error',
            variant: 'error',
          });
        }
      },
    });
  }

  if (couponsQ.isLoading) return <AdminLoading />;

  if (couponsQ.error) {
    return (
      <AdminError
        message={getUserFacingErrorMessage(
          couponsQ.error,
          'Failed to load coupons',
        )}
      />
    );
  }

  return (
    <AdminPanel
      title='Coupons'
      description='Manage discount coupons'
      action={
        <Button
          onClick={openCreate}
          className='gap-2'
        >
          <Plus className='h-4 w-4' />
          Create Coupon
        </Button>
      }
    >
      <AdminTable
        headers={[
          'Code',
          'Type',
          'Value',
          'Usage',
          'Min Order',
          'Status',
          'Expires',
          'Actions',
        ]}
        empty={coupons.length === 0}
      >
        {coupons.map((coupon) => (
          <tr
            key={coupon._id}
            className='bg-white/30'
          >
            <td className='px-4 py-3 font-medium text-indigo-950'>
              {coupon.code}
            </td>
            <td className='px-4 py-3'>
              <span className='inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800'>
                {coupon.discountType}
              </span>
            </td>
            <td className='px-4 py-3'>
              {coupon.discountType === 'percentage'
                ? `${coupon.discountValue}%`
                : `$${coupon.discountValue}`}
            </td>
            <td className='px-4 py-3'>
              {coupon.usageLimit
                ? `${coupon.usedCount}/${coupon.usageLimit}`
                : `${coupon.usedCount}/∞`}
            </td>
            <td className='px-4 py-3'>${coupon.minimumOrderAmount}</td>
            <td className='px-4 py-3'>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  coupon.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {coupon.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className='px-4 py-3'>
              {new Date(coupon.expirationDate).toLocaleDateString()}
            </td>
            <td className='px-4 py-3'>
              <AdminRowActions
                onEdit={() => openEdit(coupon)}
                onDelete={() => handleDelete(coupon)}
              />
            </td>
          </tr>
        ))}
      </AdminTable>

      <AdminModal
        open={open}
        onClose={closeModal}
        title={modalTitle}
        footer={
          <>
            <Button
              variant='outline'
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          <AdminField label='Coupon Code'>
            <AdminInput
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              placeholder='SUMMER20'
              disabled={saving}
            />
          </AdminField>

          <AdminField label='Discount Type'>
            <AdminSelect
              value={form.discountType}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountType: e.target.value as 'percentage' | 'fixed',
                })
              }
              disabled={saving}
            >
              <option value='percentage'>Percentage</option>
              <option value='fixed'>Fixed Amount</option>
            </AdminSelect>
          </AdminField>

          <AdminField label='Discount Value'>
            <AdminInput
              type='number'
              value={form.discountValue}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountValue: parseFloat(e.target.value) || 0,
                })
              }
              placeholder={form.discountType === 'percentage' ? '20' : '10'}
              disabled={saving}
            />
          </AdminField>

          <AdminField label='Expiration Date'>
            <AdminInput
              type='date'
              value={form.expirationDate}
              onChange={(e) =>
                setForm({ ...form, expirationDate: e.target.value })
              }
              disabled={saving}
            />
          </AdminField>

          <AdminField label='Usage Limit (optional)'>
            <AdminInput
              type='number'
              value={form.usageLimit || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  usageLimit: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder='Leave empty for unlimited'
              disabled={saving}
            />
          </AdminField>

          <AdminField label='Minimum Order Amount'>
            <AdminInput
              type='number'
              value={form.minimumOrderAmount}
              onChange={(e) =>
                setForm({
                  ...form,
                  minimumOrderAmount: parseFloat(e.target.value) || 0,
                })
              }
              placeholder='0'
              disabled={saving}
            />
          </AdminField>

          <AdminField label='Status'>
            <AdminSelect
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.value === 'true' })
              }
              disabled={saving}
            >
              <option value='true'>Active</option>
              <option value='false'>Inactive</option>
            </AdminSelect>
          </AdminField>

          <AdminField label='Description (optional)'>
            <AdminTextarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder='Admin notes about this coupon'
              disabled={saving}
              rows={3}
            />
          </AdminField>
        </div>
      </AdminModal>
    </AdminPanel>
  );
}
