'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  useAdminBrands,
  useCreateBrandMutation,
  useDeleteBrandMutation,
  useUpdateBrandMutation,
} from '@/hooks/admin/adminQuery';
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
  AdminTable,
  AdminTextarea,
} from './admin-ui';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  logo: '',
  website: '',
  country: '',
};

export function AdminBrandsPanel() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const brandsQ = useAdminBrands();
  const createMut = useCreateBrandMutation();
  const updateMut = useUpdateBrandMutation();
  const deleteMut = useDeleteBrandMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const brands = brandsQ.data?.data || [];

  const modalTitle = editing ? 'Edit brand' : 'Create brand';
  const saving = createMut.isPending || updateMut.isPending;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(brand: any) {
    setEditing(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      logo: brand.logo || '',
      website: brand.website || '',
      country: brand.country || '',
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast('Name and slug are required.', {
        title: 'Validation',
        variant: 'error',
      });
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload: form });
        toast('Brand updated.', { title: 'Saved', variant: 'success' });
      } else {
        await createMut.mutateAsync(form);
        toast('Brand created.', { title: 'Created', variant: 'success' });
      }
      closeModal();
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not save brand'), {
        title: 'Error',
        variant: 'error',
      });
    }
  }

  function handleDelete(brand: any) {
    void confirm({
      variant: 'danger',
      title: 'Delete this brand?',
      description: `"${brand.name}" will be removed permanently.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(brand._id);
          toast('Brand deleted.', { title: 'Deleted', variant: 'success' });
        } catch (err) {
          logErrorForDev(err);
          toast(getUserFacingErrorMessage(err, 'Could not delete brand'), {
            title: 'Error',
            variant: 'error',
          });
        }
      },
    });
  }

  if (brandsQ.isLoading) return <AdminLoading />;
  if (brandsQ.error) {
    return (
      <AdminError
        message={getUserFacingErrorMessage(
          brandsQ.error,
          'Failed to load brands',
        )}
      />
    );
  }

  return (
    <>
      <AdminPanel
        title='Brands'
        description='Create, update, and remove marketplace brands.'
        action={
          <Button
            type='button'
            size='sm'
            onClick={openCreate}
          >
            <Plus className='mr-1 h-4 w-4' />
            New brand
          </Button>
        }
      >
        <AdminTable
          headers={['Name', 'Slug', 'Country', 'Website', 'Actions']}
          empty={brands.length === 0}
        >
          {brands.map((b: any) => (
            <tr
              key={b._id}
              className='bg-white/30'
            >
              <td className='px-4 py-3 font-extrabold text-indigo-950'>
                {b.name}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {b.slug}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {b.country || '—'}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {b.website ? (
                  <a
                    href={b.website}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-fuchsia-600 hover:text-fuchsia-700'
                  >
                    Visit
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className='px-4 py-3'>
                <AdminRowActions
                  onEdit={() => openEdit(b)}
                  onDelete={() => handleDelete(b)}
                />
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminModal
        open={open}
        title={modalTitle}
        onClose={closeModal}
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <AdminField label='Name'>
          <AdminInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder='Brand name'
          />
        </AdminField>
        <AdminField label='Slug'>
          <AdminInput
            value={form.slug}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
              }))
            }
            placeholder='brand-slug'
          />
        </AdminField>
        <AdminField label='Description'>
          <AdminTextarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder='Brand description'
          />
        </AdminField>
        <AdminField label='Logo URL'>
          <AdminInput
            value={form.logo}
            onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
            placeholder='https://…'
          />
        </AdminField>
        <AdminField label='Website'>
          <AdminInput
            value={form.website}
            onChange={(e) =>
              setForm((f) => ({ ...f, website: e.target.value }))
            }
            placeholder='https://…'
          />
        </AdminField>
        <AdminField label='Country'>
          <AdminInput
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value }))
            }
            placeholder='Country of origin'
          />
        </AdminField>
      </AdminModal>
    </>
  );
}
