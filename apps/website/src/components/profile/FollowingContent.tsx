'use client';

import { Users, UserMinus, Calendar, ShieldCheck } from 'lucide-react';

const dummyFollowing = [
  {
    _id: '1',
    username: 'creative_studio',
    email: 'studio@example.com',
    country: 'USA',
    bio: 'Premium template provider',
    roles: ['Creator', 'Seller'],
    followedAt: '2024-01-10T08:00:00Z',
  },
  {
    _id: '2',
    username: 'design_pro',
    email: 'design@example.com',
    country: 'Germany',
    bio: 'Award-winning designer',
    roles: ['Creator'],
    followedAt: '2024-02-15T11:30:00Z',
  },
  {
    _id: '3',
    username: 'web_master',
    email: 'webmaster@example.com',
    country: 'France',
    bio: 'Web development expert',
    roles: ['Creator', 'Developer'],
    followedAt: '2024-03-05T15:20:00Z',
  },
  {
    _id: '4',
    username: 'template_king',
    email: 'king@example.com',
    country: 'Spain',
    bio: 'Template marketplace seller',
    roles: ['Seller'],
    followedAt: '2024-04-01T09:00:00Z',
  },
];

export default function FollowingContent() {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Following</h1>
        <div className="text-sm text-gray-600">
          {dummyFollowing.length} {dummyFollowing.length === 1 ? 'following' : 'following'}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Following Since
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dummyFollowing.map((following) => (
              <tr key={following._id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                      {following.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {following.username}
                      </div>
                      <div className="text-sm text-gray-600">{following.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{following.country}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {following.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(following.followedAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700 transition">
                    <UserMinus className="w-4 h-4" />
                    Unfollow
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dummyFollowing.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Not following anyone</h2>
          <p className="text-gray-600">
            Follow creators and sellers to see their latest templates and updates.
          </p>
        </div>
      )}
    </div>
  );
}
