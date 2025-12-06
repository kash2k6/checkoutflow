import { Settings, Package, ArrowUpDown, CheckCircle2, Cog } from 'lucide-react';
import FrostedCard from './FrostedCard';

interface SidebarNavProps {
  activeStep: number;
  onStepChange: (step: number) => void;
}

const steps = [
  { id: 1, label: 'Flow Setup', icon: Settings },
  { id: 2, label: 'Initial Product', icon: Package },
  { id: 3, label: 'Upsells & Downsells', icon: ArrowUpDown },
  { id: 4, label: 'Confirmation Page', icon: CheckCircle2 },
  { id: 5, label: 'Advanced Settings', icon: Cog },
];

export default function SidebarNav({ activeStep, onStepChange }: SidebarNavProps) {
  return (
    <div className="w-64 flex-shrink-0">
      <FrostedCard className="sticky top-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-gray-12 mb-4">Flow Builder</h2>
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => onStepChange(step.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                  isActive
                    ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20'
                    : 'text-gray-10 hover:text-gray-12 hover:bg-gray-a3'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent-600 dark:text-accent-400' : 'text-gray-10'}`} />
                <span className="font-semibold">{step.label}</span>
              </button>
            );
          })}
        </div>
      </FrostedCard>
    </div>
  );
}

