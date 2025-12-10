import { Settings, Package, ArrowUpDown, CheckCircle2, Cog, X } from 'lucide-react';
import FrostedCard from './FrostedCard';

interface SidebarNavProps {
  activeStep: number;
  onStepChange: (step: number) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const steps = [
  { id: 1, label: 'Flow Setup', icon: Settings },
  { id: 2, label: 'Initial Product', icon: Package },
  { id: 3, label: 'Upsells & Downsells', icon: ArrowUpDown },
  { id: 4, label: 'Confirmation Page', icon: CheckCircle2 },
  { id: 5, label: 'Advanced Settings', icon: Cog },
];

export default function SidebarNav({ activeStep, onStepChange, isMobileOpen, onMobileClose }: SidebarNavProps) {
  const handleStepClick = (step: number) => {
    onStepChange(step);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-64 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <FrostedCard className="h-full md:h-auto md:sticky md:top-6 rounded-none md:rounded-xl">
          <div className="p-4 md:p-0">
            <div className="flex items-center justify-between mb-4 md:mb-4">
              <h2 className="text-lg font-bold text-gray-12">Flow Builder</h2>
              {onMobileClose && (
                <button
                  onClick={onMobileClose}
                  className="md:hidden p-2 hover:bg-gray-a3 rounded-lg transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-12" />
                </button>
              )}
            </div>
            <div className="space-y-2">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left min-h-[44px] touch-manipulation ${
                      isActive
                        ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20'
                        : 'text-gray-10 hover:text-gray-12 hover:bg-gray-a3'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent-600 dark:text-accent-400' : 'text-gray-10'}`} />
                    <span className="font-semibold text-sm md:text-base">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </FrostedCard>
      </div>
    </>
  );
}

