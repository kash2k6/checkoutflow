import { ReactNode } from 'react';

interface FrostedCardProps {
  children: ReactNode;
  className?: string;
}

export default function FrostedCard({ children, className = '' }: FrostedCardProps) {
  return (
    <div
      className={`border border-gray-a4 rounded-xl p-4 md:p-6 bg-white dark:bg-gray-a2 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

