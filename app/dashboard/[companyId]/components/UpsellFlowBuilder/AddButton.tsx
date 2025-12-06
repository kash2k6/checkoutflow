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
      className={`px-4 py-2.5 ${className}`}
    >
      {label}
    </FrostedButton>
  );
}

