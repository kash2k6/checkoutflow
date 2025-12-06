import { useState } from 'react';
import FrostedCard from './FrostedCard';
import FrostedButton from './FrostedButton';
import InputField from './InputField';
import { Save } from 'lucide-react';

interface CompanyFlow {
  id?: string;
  flow_name: string | null;
  company_id: string;
}

interface StepFlowSetupProps {
  flow: CompanyFlow | null;
  onUpdate: (updates: Partial<CompanyFlow>) => void;
  onSave: () => Promise<void>;
  companyId: string;
}

export default function StepFlowSetup({ flow, onUpdate, onSave, companyId }: StepFlowSetupProps) {
  const [description, setDescription] = useState('');
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
        <h1 className="text-2xl font-bold text-gray-12 mb-2">Flow Setup</h1>
        <p className="text-gray-600">Configure the basic settings for your funnel</p>
      </div>

      <FrostedCard>
        <div className="space-y-6">
          <InputField
            label="Flow Name"
            value={flow?.flow_name || ''}
            onChange={(e) => onUpdate({ flow_name: e.target.value })}
            placeholder="e.g., Black Friday Funnel"
          />

          <InputField
            label="Description (Optional)"
            textarea
            textareaProps={{
              value: description,
              onChange: (e) => setDescription(e.target.value),
              placeholder: 'Add a description for this funnel...',
              rows: 4,
            }}
          />

          <div className="flex justify-end pt-4">
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

