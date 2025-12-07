import { useState } from 'react';
import FrostedCard from './FrostedCard';
import FrostedButton from './FrostedButton';
import InputField from './InputField';
import { Save, Palette } from 'lucide-react';

interface CompanyFlow {
  confirmation_page_url: string | null;
}

interface StepConfirmationProps {
  flow: CompanyFlow | null;
  onUpdate: (updates: Partial<CompanyFlow>) => void;
  onSave: () => Promise<void>;
  onCustomize: () => void;
}

export default function StepConfirmation({ flow, onUpdate, onSave, onCustomize }: StepConfirmationProps) {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-12 mb-2">Confirmation Page</h1>
        <p className="text-gray-600">Configure where customers land after completing their purchase</p>
      </div>

      <FrostedCard>
        <div className="space-y-6">
          <InputField
            label="Confirmation Page URL"
            type="url"
            value={flow?.confirmation_page_url || ''}
            onChange={(e) => onUpdate({ confirmation_page_url: e.target.value || null })}
            placeholder="https://yourdomain.com/thank-you"
          />

          <div className="flex gap-4 justify-end pt-4">
            <FrostedButton
              onClick={onCustomize}
              icon={Palette}
              variant="secondary"
            >
              Customize Confirmation Page
            </FrostedButton>
            <FrostedButton
              onClick={handleSave}
              icon={Save}
              variant="accent"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Flow'}
            </FrostedButton>
          </div>
        </div>
      </FrostedCard>
    </div>
  );
}

