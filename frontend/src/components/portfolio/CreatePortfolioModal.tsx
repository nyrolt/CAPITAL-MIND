import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { Loader2 } from 'lucide-react';

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePortfolioModal: React.FC<CreatePortfolioModalProps> = ({ isOpen, onClose }) => {
  const { createPortfolio } = useApp();
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('Wealth Maximization');
  const [riskPreference, setRiskPreference] = useState('Aggressive');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await createPortfolio({
        name,
        objective,
        riskPreference,
        description: description || 'Custom user investment portfolio.',
      });
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create portfolio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Portfolio"
      subtitle="Establish a new asset bucket with targeted risk preferences."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 bg-financial-negativeBg border border-financial-negative/30 rounded-xl text-financial-negative">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-semibold text-graphite mb-1">Portfolio Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Dividend Yield Core / Wealth 2030"
            className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-graphite mb-1">Investment Objective</label>
            <select
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
            >
              <option value="Wealth Maximization">Wealth Maximization</option>
              <option value="Capital Preservation">Capital Preservation</option>
              <option value="Passive Income / Dividends">Passive Income / Dividends</option>
              <option value="Balanced Growth">Balanced Growth</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-graphite mb-1">Risk Preference</label>
            <select
              value={riskPreference}
              onChange={e => setRiskPreference(e.target.value)}
              className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
            >
              <option value="Aggressive">Aggressive</option>
              <option value="Moderate">Moderate</option>
              <option value="Conservative">Conservative</option>
              <option value="Very Aggressive">Very Aggressive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-graphite mb-1">Description / Strategy</label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the asset strategy or benchmark targets..."
            className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-silver-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            icon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
          >
            {isSubmitting ? 'Creating...' : 'Create Portfolio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
