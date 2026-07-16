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
} from 'lucide-react';
import { useState } from 'react';

export default function DownloadsContent() {
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
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Failed to load downloads
      </div>
    );
  }

  if (!downloads || downloads.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <DownloadIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No downloads yet</h2>
        <p className="text-gray-600">
          Your purchased templates will appear here for download.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Downloads</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Template
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Downloads
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {downloads.map((download) => (
              <tr key={download._id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                      <img
                        src={download.template?.cover}
                        alt={download.template?.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {download.template?.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        ${download.template?.price?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash className="w-4 h-4" />
                    <span>#{download.order?._id?.slice(-6).toUpperCase()}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">
                    {download.downloadCount} / {download.downloadLimit}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(download.createdAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(download)}
                      disabled={
                        downloadingId === download._id ||
                        download.downloadCount >= download.downloadLimit
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition disabled:opacity-50"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      {downloadingId === download._id ? 'Downloading...' : 'Download'}
                    </button>
                    <button
                      onClick={() => handleDelete(download._id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 rounded-lg p-6 text-white">
        <h3 className="font-bold mb-2">Need help with your downloads?</h3>
        <p className="text-white/90 text-sm mb-4">
          If you have issues downloading templates, please check our FAQ or contact support.
        </p>
        <div className="flex gap-3">
          <a
            href="/faq"
            className="inline-flex items-center gap-2 bg-white text-fuchsia-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition text-sm"
          >
            <FolderOpen className="w-4 h-4" />
            View FAQ
          </a>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
