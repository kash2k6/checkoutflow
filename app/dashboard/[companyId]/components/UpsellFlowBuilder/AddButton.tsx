import { Plus, LucideIcon } from 'lucide-react';
import FrostedButton from './FrostedButton';

interface AddButtonProps {
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export default function AddButton({ onClick, label, icon: Icon = Plus, className = '' }: AddButtonProps) {
  return (
    <FrostedButton
      onClick={onClick}
      icon={Icon}
      variant="accent"
      className={`px-3 md:px-4 py-2.5 w-full sm:w-auto min-h-[44px] touch-manipulation ${className}`}
    >
      {label}
    </FrostedButton>
  );
}

