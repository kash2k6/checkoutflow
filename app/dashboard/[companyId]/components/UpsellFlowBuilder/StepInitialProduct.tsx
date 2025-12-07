import { useState, useEffect } from 'react';
import FrostedCard from './FrostedCard';
import FrostedButton from './FrostedButton';
import InputField from './InputField';
import { Save } from 'lucide-react';

interface WhopPlan {
  id: string;
  title: string;
  initial_price: number;
  currency: string;
}

interface CompanyFlow {
  initial_product_plan_id: string;
}

interface StepInitialProductProps {
  flow: CompanyFlow | null;
  onUpdate: (updates: Partial<CompanyFlow>) => void;
  onSave: () => Promise<void>;
  companyId: string;
}

export default function StepInitialProduct({ flow, onUpdate, onSave, companyId }: StepInitialProductProps) {
  const [plans, setPlans] = useState<WhopPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch(`/api/whop/plans?companyId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          const mappedPlans = (data.plans || []).map((plan: any) => ({
            id: plan.id,
            title: plan.title || plan.product?.title || `Plan ${plan.id.substring(0, 8)}...`,
            initial_price: plan.initial_price || 0,
            currency: plan.currency || 'usd',
          }));
          setPlans(mappedPlans);
        }
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [companyId]);

  const selectedPlan = plans.find(p => p.id === flow?.initial_product_plan_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-12 mb-2">Initial Product</h1>
        <p className="text-gray-600">Select the product customers will purchase initially</p>
      </div>

      <FrostedCard>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-12 mb-2">
              Initial Purchase Product
            </label>
            {loading ? (
              <div className="text-gray-500">Loading products...</div>
            ) : (
              <select
                value={flow?.initial_product_plan_id || ''}
                onChange={(e) => onUpdate({ initial_product_plan_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-a4 rounded-xl bg-white dark:bg-gray-a3 text-gray-12 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Select a product...</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title} - ${plan.initial_price} {plan.currency.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedPlan && (
            <div className="p-4 bg-gray-50 rounded-xl border border-[#E5E6EA]">
              <div className="text-sm font-semibold text-gray-12 mb-1">Selected Product:</div>
              <div className="text-base text-gray-700">{selectedPlan.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                ${selectedPlan.initial_price} {selectedPlan.currency.toUpperCase()}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <FrostedButton
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave();
                } catch (error) {
                  console.error('Error saving flow:', error);
                } finally {
                  setSaving(false);
                }
              }}
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

