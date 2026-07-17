'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  useAdminBrands,
  useCreateProductMutation,
  useDeleteProductMutation,
  useUpdateProductMutation,
  useAdminProducts,
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
  AdminSelect,
  AdminTable,
  AdminTextarea,
} from './admin-ui';

const emptyForm = {
  title: '',
  brand: '',
  description: '',
  price: 0,
  cover: '',
  category: 'makeup',
  subcategory: '',
  stock: 0,
  sku: '',
};

const categories = [
  { value: 'makeup', label: 'Makeup' },
  { value: 'perfumes', label: 'Perfumes' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'skincare', label: 'Skincare' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'home', label: 'Home & Living' },
];

export function AdminProductsPanel() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const productsQ = useAdminProducts();
  const brandsQ = useAdminBrands();
  const createMut = useCreateProductMutation();
  const updateMut = useUpdateProductMutation();
  const deleteMut = useDeleteProductMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const brands = brandsQ.data?.data || [];
  const products = productsQ.data?.data || [];

  const modalTitle = editing ? 'Edit product' : 'Create product';
  const saving = createMut.isPending || updateMut.isPending;

  const defaultBrand = useMemo(() => brands[0]?._id || '', [brands]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, brand: defaultBrand });
    setOpen(true);
  }

  function openEdit(product: any) {
    setEditing(product);
    setForm({
      title: product.title,
      brand:
        typeof product.brand === 'string'
          ? product.brand
          : product.brand?._id || '',
      description: product.description,
      price: product.price,
      cover: product.cover,
      category: product.category,
      subcategory: product.subcategory,
      stock: product.stock,
      sku: product.sku || '',
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.brand || !form.cover.trim()) {
      toast('Title, brand, and cover URL are required.', {
        title: 'Validation',
        variant: 'error',
      });
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, payload: form });
        toast('Product updated.', { title: 'Saved', variant: 'success' });
      } else {
        await createMut.mutateAsync(form);
        toast('Product created.', { title: 'Created', variant: 'success' });
      }
      closeModal();
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not save product'), {
        title: 'Error',
        variant: 'error',
      });
    }
  }

  function handleDelete(product: any) {
    void confirm({
      variant: 'danger',
      title: 'Delete this product?',
      description: `"${product.title}" will be removed permanently.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(product._id);
          toast('Product deleted.', { title: 'Deleted', variant: 'success' });
        } catch (err) {
          logErrorForDev(err);
          toast(getUserFacingErrorMessage(err, 'Could not delete product'), {
            title: 'Error',
            variant: 'error',
          });
        }
      },
    });
  }

  if (productsQ.isLoading) return <AdminLoading />;
  if (productsQ.error) {
    return (
      <AdminError
        message={getUserFacingErrorMessage(
          productsQ.error,
          'Failed to load products',
        )}
      />
    );
  }

  return (
    <>
      <AdminPanel
        title='Products'
        description='Create, update, and remove marketplace products.'
        action={
          <Button
            type='button'
            size='sm'
            onClick={openCreate}
            disabled={brands.length === 0}
          >
            <Plus className='mr-1 h-4 w-4' />
            New product
          </Button>
        }
      >
        {brands.length === 0 ? (
          <p className='mb-4 text-sm font-semibold text-amber-800'>
            Add at least one brand before creating products.
          </p>
        ) : null}

        <AdminTable
          headers={['Title', 'Brand', 'Category', 'Price', 'Stock', 'Actions']}
          empty={products.length === 0}
        >
          {products.map((p: any) => (
            <tr
              key={p._id}
              className='bg-white/30'
            >
              <td className='px-4 py-3 font-extrabold text-indigo-950'>
                {p.title}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {typeof p.brand === 'string' ? p.brand : p.brand?.name || '—'}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {p.category}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                ${p.price.toFixed(2)}
              </td>
              <td className='px-4 py-3 font-semibold text-indigo-950/75'>
                {p.stock}
              </td>
              <td className='px-4 py-3'>
                <AdminRowActions
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p)}
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
        <AdminField label='Title'>
          <AdminInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder='Product title'
          />
        </AdminField>
        <AdminField label='Brand'>
          <AdminSelect
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
          >
            <option value=''>Select brand</option>
            {brands.map((b: any) => (
              <option
                key={b._id}
                value={b._id}
              >
                {b.name}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label='Category'>
          <AdminSelect
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
          >
            {categories.map((c) => (
              <option
                key={c.value}
                value={c.value}
              >
                {c.label}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label='Subcategory'>
          <AdminInput
            value={form.subcategory}
            onChange={(e) =>
              setForm((f) => ({ ...f, subcategory: e.target.value }))
            }
            placeholder='e.g. Face, Eyes, For Her'
          />
        </AdminField>
        <AdminField label='Description'>
          <AdminTextarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder='Product description'
          />
        </AdminField>
        <AdminField label='Price (USD)'>
          <AdminInput
            type='number'
            min={0}
            step='0.01'
            value={form.price}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))
            }
          />
        </AdminField>
        <AdminField label='Stock'>
          <AdminInput
            type='number'
            min={0}
            value={form.stock}
            onChange={(e) =>
              setForm((f) => ({ ...f, stock: Number(e.target.value) || 0 }))
            }
          />
        </AdminField>
        <AdminField label='SKU'>
          <AdminInput
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            placeholder='Stock keeping unit'
          />
        </AdminField>
        <AdminField label='Cover image URL'>
          <AdminInput
            value={form.cover}
            onChange={(e) => setForm((f) => ({ ...f, cover: e.target.value }))}
            placeholder='https://…'
          />
        </AdminField>
      </AdminModal>
    </>
  );
}
