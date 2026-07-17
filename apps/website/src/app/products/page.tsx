'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/products/ProductCard';
import { useProducts } from '@/hooks/products/productsQuery';
import { CategorySidebar } from '@/components/products/CategorySidebar';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 12;

  const {
    data: response,
    isLoading,
    error,
  } = useProducts({
    page: currentPage,
    limit,
    sort: 'createdAt',
  });
  const products = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, pages: 1, limit };

  const filteredProducts = products.filter(
    (product: any) =>
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center text-red-600'>
          <p>Failed to load products</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='flex gap-8'>
          {/* Sidebar */}
          <div className='hidden lg:block'>
            <CategorySidebar />
          </div>

          {/* Main Content */}
          <div className='flex-1'>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className='mb-8'
            >
              <h1 className='text-3xl font-extrabold text-gray-900 mb-2'>
                Products
              </h1>
              <p className='text-gray-600'>
                Discover amazing products for your lifestyle
              </p>
            </motion.div>

            {/* Search and Filter */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className='mb-8 flex gap-4'
            >
              <div className='relative flex-1 max-w-xl'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5' />
                <Input
                  type='text'
                  placeholder='Search products...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
              <Button
                variant='outline'
                className='gap-2'
              >
                <Filter className='h-4 w-4' />
                Filters
              </Button>
            </motion.div>

            {/* Products Grid */}
            {filteredProducts && filteredProducts.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                >
                  {filteredProducts.map((product: any) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                    />
                  ))}
                </motion.div>

                {/* Pagination */}
                {meta.pages > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className='flex items-center justify-center gap-2 mt-8'
                  >
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    {Array.from({ length: meta.pages }, (_, i) => i + 1).map(
                      (page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size='sm'
                          onClick={() => handlePageChange(page)}
                          className={
                            currentPage === page
                              ? 'bg-fuchsia-600 text-white'
                              : ''
                          }
                        >
                          {page}
                        </Button>
                      ),
                    )}

                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === meta.pages}
                    >
                      Next
                    </Button>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className='text-center py-12'
              >
                <p className='text-gray-500 text-lg'>
                  {searchQuery
                    ? 'No products found matching your search.'
                    : 'No products available.'}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
