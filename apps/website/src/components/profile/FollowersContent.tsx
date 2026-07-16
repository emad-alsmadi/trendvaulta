'use client';

import { Users, UserPlus, Calendar, ShieldCheck } from 'lucide-react';

const dummyFollowers = [
  {
    _id: '1',
    username: 'john_doe',
    email: 'john@example.com',
    country: 'USA',
    bio: 'Web developer and designer',
    roles: ['Developer'],
    followedAt: '2024-01-15T10:00:00Z',
  },
  {
    _id: '2',
    username: 'jane_smith',
    email: 'jane@example.com',
    country: 'UK',
    bio: 'Creative director',
    roles: ['Designer'],
    followedAt: '2024-02-20T14:30:00Z',
  },
  {
    _id: '3',
    username: 'mike_wilson',
    email: 'mike@example.com',
    country: 'Canada',
    bio: 'Full-stack developer',
    roles: ['Developer', 'Designer'],
    followedAt: '2024-03-10T09:15:00Z',
  },
  {
    _id: '4',
    username: 'sarah_jones',
    email: 'sarah@example.com',
    country: 'Australia',
    bio: 'UI/UX specialist',
    roles: ['Designer'],
    followedAt: '2024-04-05T16:45:00Z',
  },
];

export default function FollowersContent() {
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
        <h1 className="text-2xl font-bold text-gray-900">Followers</h1>
        <div className="text-sm text-gray-600">
          {dummyFollowers.length} {dummyFollowers.length === 1 ? 'follower' : 'followers'}
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
                Followed Since
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dummyFollowers.map((follower) => (
              <tr key={follower._id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {follower.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {follower.username}
                      </div>
                      <div className="text-sm text-gray-600">{follower.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">{follower.country}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {follower.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-fuchsia-100 text-fuchsia-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(follower.followedAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition">
                    <UserPlus className="w-4 h-4" />
                    Follow Back
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dummyFollowers.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No followers yet</h2>
          <p className="text-gray-600">
            Share your profile to start building your community.
          </p>
        </div>
      )}
    </div>
  );
}
