import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
}

export default function SectionHeader({ title, icon: Icon, className = '', children }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-accent-500" />}
        <h3 className="text-lg font-bold text-gray-12">{title}</h3>
      </div>
      {children}
    </div>
  );
}

