import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { CreatePortfolioModal } from '../../components/portfolio/CreatePortfolioModal';
import { useApp } from '../../context/AppContext';
import { Plus, ArrowRight, ShieldAlert, PieChart, Wallet, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

export const PortfoliosPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    portfolios,
    setSelectedPortfolioId,
    selectedPortfolioId,
    deletePortfolio,
    isLoading,
    error,
    refreshPortfolios,
  } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete portfolio "${name}"?`)) {
      setDeletingId(id);
      try {
        await deletePortfolio(id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete portfolio');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <AppShell pageTitle="My Portfolios">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-graphite tracking-tight">Your Investment Portfolios</h2>
            <p className="text-xs text-muted mt-0.5">Manage risk buckets and multi-asset targets</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={() => refreshPortfolios()}
            >
              Refresh
            </Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
              Create New Portfolio
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-financial-negativeBg border border-financial-negative/30 flex items-center justify-between text-xs text-financial-negative">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => refreshPortfolios()}
              className="font-bold underline hover:no-underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton count={2} />
        ) : portfolios.length === 0 ? (
          <EmptyState
            title="No Portfolios Found"
            description="You have not created any investment portfolios yet. Create your first portfolio to start tracking your assets and intelligence metrics."
            icon={<Wallet className="w-8 h-8" />}
            actionText="Create Portfolio"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portfolios.map(p => {
              const isSelected = p.id === selectedPortfolioId;
              const isDeleting = deletingId === p.id;
              return (
                <div
                  key={p.id}
                  className={`p-6 bg-white rounded-3xl border transition-all duration-200 shadow-silver-sm hover:shadow-silver-md flex flex-col justify-between ${
                    isSelected ? 'border-graphite shadow-silver-md ring-1 ring-graphite' : 'border-silver-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-silver-light text-graphite border border-silver-border">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-graphite">{p.name}</h3>
                          <p className="text-[11px] text-muted">{p.objective}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && <Badge variant="silver">Active</Badge>}
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={isDeleting}
                          title="Delete portfolio"
                          className="p-1.5 rounded-lg text-muted hover:text-financial-negative hover:bg-financial-negativeBg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-4">
                      {p.description || 'Custom user investment portfolio.'}
                    </p>

                    <div className="p-4 rounded-2xl bg-background-secondary border border-silver-border space-y-3 mb-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-muted">Portfolio Value</span>
                        <span className="text-xl font-bold text-graphite">₹{p.totalValue.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-silver-border">
                        <span className="text-muted">Total P/L:</span>
                        <span className={`font-bold ${p.profitLoss >= 0 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                          {p.profitLoss >= 0 ? '+' : ''}₹{p.profitLoss.toLocaleString('en-IN')} ({p.returnPercentage.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-silver-border flex items-center justify-between">
                        <span className="text-muted flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Risk
                        </span>
                        <span className="font-bold text-graphite">{p.riskScore}/100 ({p.riskLevel})</span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-silver-border flex items-center justify-between">
                        <span className="text-muted flex items-center gap-1">
                          <PieChart className="w-3.5 h-3.5" /> Diversification
                        </span>
                        <span className="font-bold text-graphite">{p.diversificationScore}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-silver-border flex items-center justify-between gap-3">
                    <Button
                      variant={isSelected ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPortfolioId(p.id)}
                    >
                      {isSelected ? 'Currently Active' : 'Set Active'}
                    </Button>

                    <button
                      onClick={() => {
                        setSelectedPortfolioId(p.id);
                        navigate(`/portfolio/${p.id}`);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-graphite hover:text-muted"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CreatePortfolioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </AppShell>
  );
};
