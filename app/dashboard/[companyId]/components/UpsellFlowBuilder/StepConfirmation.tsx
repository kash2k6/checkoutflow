import FrostedCard from './FrostedCard';
import FrostedButton from './FrostedButton';
import InputField from './InputField';
import { Eye, Palette } from 'lucide-react';

interface CompanyFlow {
  confirmation_page_url: string | null;
}

interface StepConfirmationProps {
  flow: CompanyFlow | null;
  onUpdate: (updates: Partial<CompanyFlow>) => void;
  onCustomize: () => void;
}

export default function StepConfirmation({ flow, onUpdate, onCustomize }: StepConfirmationProps) {
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

          <div className="flex gap-4 pt-4">
            <FrostedButton
              onClick={() => {
                if (flow?.confirmation_page_url) {
                  alert(`Preview for: ${flow.confirmation_page_url}\n\nThis feature will open a preview window.`);
                } else {
                  alert('Please enter a confirmation page URL first.');
                }
              }}
              icon={Eye}
              variant="secondary"
              disabled={!flow?.confirmation_page_url}
            >
              Preview Confirmation Page
            </FrostedButton>
            <FrostedButton
              onClick={onCustomize}
              icon={Palette}
              variant="accent"
            >
              Customize Confirmation Page
            </FrostedButton>
          </div>
        </div>
      </FrostedCard>
    </div>
  );
}

