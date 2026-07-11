'use client';

interface LicenseBadgeProps {
  licenseType: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LicenseBadge({ licenseType, size = 'md' }: LicenseBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const licenseColors = {
    personal: 'bg-blue-100 text-blue-700 border-blue-200',
    commercial: 'bg-purple-100 text-purple-700 border-purple-200',
    extended: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  };

  const colorClass = licenseColors[licenseType as keyof typeof licenseColors] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium capitalize ${sizeClasses[size]} ${colorClass}`}
    >
      {licenseType}
    </span>
  );
}
