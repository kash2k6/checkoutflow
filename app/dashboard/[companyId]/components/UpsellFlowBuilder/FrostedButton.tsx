import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@whop/react/components';

interface FrostedButtonProps {
  onClick: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
  className?: string;
}

export default function FrostedButton({
  onClick,
  children,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  className = '',
}: FrostedButtonProps) {
  const getColor = () => {
    switch (variant) {
      case 'primary':
      case 'accent':
        return 'tomato';
      case 'secondary':
        return 'gray';
      default:
        return 'tomato';
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      color={getColor()}
      variant="classic"
      size="2"
      className={`min-h-[44px] touch-manipulation ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  );
}

