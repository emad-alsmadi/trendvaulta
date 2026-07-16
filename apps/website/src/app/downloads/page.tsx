'use client';

import {
  useMyDownloads,
  useRecordDownload,
  useDeleteDownload,
} from '@/hooks/downloads/downloadsQuery';
import {
  Download as DownloadIcon,
  Trash2,
  FileText,
  Calendar,
  Hash,
  FolderOpen,
  ExternalLink,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DownloadsPage() {
  const { data: downloads, isLoading, error } = useMyDownloads();
  const recordDownload = useRecordDownload();
  const deleteDownload = useDeleteDownload();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (download: any) => {
    setDownloadingId(download._id);
    try {
      const result = await recordDownload.mutateAsync(download._id);
      if (result.fileUrl) {
        window.open(result.fileUrl, '_blank');
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this download?')) {
      try {
        await deleteDownload.mutateAsync(id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-48 mb-8'></div>
            <div className='h-64 bg-gray-200 rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'>
            Failed to load downloads
          </div>
        </div>
      </div>
    );
  }

  if (!downloads || downloads.length === 0) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <h1 className='text-2xl font-bold text-gray-900 mb-8'>
            My Downloads
          </h1>
          <div className='bg-white rounded-lg border border-gray-200 p-12 text-center'>
            <DownloadIcon className='w-16 h-16 text-gray-400 mx-auto mb-4' />
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>
              No downloads yet
            </h2>
            <p className='text-gray-600 mb-6'>
              After purchasing templates, they will appear here for download.
            </p>
            <Link
              href='/'
              className='inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white font-semibold rounded-lg hover:brightness-110 transition'
            >
              Browse Templates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Breadcrumb */}
        <nav className='flex items-center gap-2 text-sm text-gray-600 mb-8'>
          <Link
            href='/'
            className='hover:text-fuchsia-600'
          >
            Home
          </Link>
          <span>/</span>
          <span className='text-gray-900'>My Downloads</span>
        </nav>

        <div className='flex gap-8'>
          {/* Sidebar */}
          <aside className='w-64 flex-shrink-0 hidden lg:block'>
            <div className='bg-white rounded-lg border border-gray-200 p-4 sticky top-8'>
              <h3 className='font-bold text-gray-900 mb-4'>Account</h3>
              <nav className='space-y-1'>
                <Link
                  href='/profile'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Profile
                </Link>
                <Link
                  href='/orders'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Orders
                </Link>
                <Link
                  href='/downloads'
                  className='block px-4 py-2 rounded-lg bg-fuchsia-50 text-fuchsia-700 font-semibold'
                >
                  Downloads
                </Link>
                <Link
                  href='/wishlist'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Wishlist
                </Link>
                <Link
                  href='/reviews'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Reviews
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className='flex-1'>
            <h1 className='text-2xl font-bold text-gray-900 mb-6'>
              My Downloads
            </h1>

            <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Item
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      License
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Downloads
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Purchased
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {downloads.map((download: any) => {
                    const remainingDownloads =
                      download.downloadLimit - download.downloadCount;
                    const isLimitReached = remainingDownloads <= 0;

                    return (
                      <tr
                        key={download._id}
                        className='hover:bg-gray-50 transition'
                      >
                        <td className='px-6 py-4'>
                          <div className='flex items-start gap-4'>
                            <img
                              src={download.template.cover}
                              alt={download.template.title}
                              className='w-16 h-16 object-cover rounded-lg'
                            />
                            <div className='min-w-0'>
                              <Link
                                href={`/templates/${download.template._id}`}
                                className='font-semibold text-gray-900 hover:text-fuchsia-600 transition block mb-1'
                              >
                                {download.template.title}
                              </Link>
                              <p className='text-sm text-gray-600 line-clamp-1'>
                                {download.template.description}
                              </p>
                              <div className='flex items-center gap-1 mt-1'>
                                <Star className='w-4 h-4 text-amber-400 fill-amber-400' />
                                <span className='text-sm text-gray-600'>
                                  {download.template.averageRating?.toFixed(
                                    1,
                                  ) || '4.5'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold'>
                            Regular
                          </span>
                        </td>
                        <td className='px-6 py-4'>
                          <div className='text-sm text-gray-600'>
                            {download.downloadCount} / {download.downloadLimit}
                          </div>
                          {isLimitReached && (
                            <div className='text-xs text-red-600 mt-1'>
                              Limit reached
                            </div>
                          )}
                        </td>
                        <td className='px-6 py-4'>
                          <div className='text-sm text-gray-600'>
                            {formatDate(download.createdAt)}
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-2'>
                            <button
                              onClick={() => handleDownload(download)}
                              disabled={
                                isLimitReached ||
                                downloadingId === download._id ||
                                recordDownload.isPending
                              }
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                isLimitReached
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                              }`}
                            >
                              <DownloadIcon className='w-4 h-4' />
                              {downloadingId === download._id
                                ? 'Downloading...'
                                : 'Download'}
                            </button>
                            <button
                              onClick={() => handleDelete(download._id)}
                              disabled={deleteDownload.isPending}
                              className='p-2 text-gray-400 hover:text-red-600 transition'
                              title='Remove'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Help Section */}
            <div className='mt-8 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 rounded-lg p-6 text-white'>
              <h3 className='font-bold mb-2'>Need help with your downloads?</h3>
              <p className='text-white/90 text-sm mb-4'>
                If you're having trouble downloading your files, please check
                our FAQ or contact support.
              </p>
              <div className='flex gap-3'>
                <Link
                  href='/faq'
                  className='inline-flex items-center gap-2 bg-white text-fuchsia-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition text-sm'
                >
                  <FolderOpen className='w-4 h-4' />
                  View FAQ
                </Link>
                <Link
                  href='/contact'
                  className='inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition text-sm'
                >
                  <ExternalLink className='w-4 h-4' />
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
