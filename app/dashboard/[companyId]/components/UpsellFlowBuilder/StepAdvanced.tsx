import { useState } from 'react';
import FrostedCard from './FrostedCard';
import FrostedButton from './FrostedButton';
import InputField from './InputField';
import { Save } from 'lucide-react';

interface CompanyFlow {
  facebook_pixel_id?: string | null;
}

interface StepAdvancedProps {
  flow: CompanyFlow | null;
  onUpdate: (updates: Partial<CompanyFlow>) => void;
  onSave: () => Promise<void>;
}

export default function StepAdvanced({ flow, onUpdate, onSave }: StepAdvancedProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Error saving flow:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-12 mb-2">Advanced Settings</h1>
        <p className="text-gray-600 text-sm md:text-base">Configure advanced options for your funnel</p>
      </div>

      <FrostedCard>
        <div className="space-y-4 md:space-y-6">
          <InputField
            label="Facebook Pixel ID (Flow Level)"
            type="text"
            value={flow?.facebook_pixel_id || ''}
            onChange={(e) => onUpdate({ facebook_pixel_id: e.target.value || null })}
            placeholder="e.g., 123456789012345 (optional - can override per step)"
          />
          <p className="text-xs md:text-sm text-gray-600">
            This pixel will be used for all steps unless a step has its own pixel ID.
          </p>

          <div className="pt-4 md:pt-6 border-t border-[#E5E6EA]">
            <h3 className="text-base md:text-lg font-semibold text-[#1C1C1F] mb-3 md:mb-4">Additional Settings</h3>
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 md:p-4 bg-gray-50 rounded-xl border border-[#E5E6EA]">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-12 text-sm md:text-base">Enable Analytics Tracking</div>
                  <div className="text-xs md:text-sm text-gray-600">Track visits and conversions</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 min-h-[44px] min-w-[44px] justify-center sm:justify-start">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
                </label>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 md:p-4 bg-gray-50 rounded-xl border border-[#E5E6EA]">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-12 text-sm md:text-base">A/B Testing</div>
                  <div className="text-xs md:text-sm text-gray-600">Test different funnel variations</div>
                  <div className="text-[10px] md:text-xs text-gray-500 mt-1">Coming Soon</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer opacity-50 flex-shrink-0 min-h-[44px] min-w-[44px] justify-center sm:justify-start">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 md:pt-4">
            <FrostedButton
              onClick={handleSave}
              icon={Save}
              variant="accent"
              disabled={saving}
              className="min-h-[44px] touch-manipulation"
            >
              {saving ? 'Saving...' : 'Save Flow'}
            </FrostedButton>
          </div>
        </div>
      </FrostedCard>
    </div>
  );
}

