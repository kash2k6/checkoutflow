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
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-3 md:mb-4 ${className}`}>
      <div className="flex items-center gap-2 md:gap-3">
        {Icon && <Icon className="w-4 h-4 md:w-5 md:h-5 text-accent-500" />}
        <h3 className="text-base md:text-lg font-bold text-gray-12">{title}</h3>
      </div>
      {children}
    </div>
  );
}

