import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { useNotifications } from '../../context/NotificationContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

export default function PlansManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    duration_days: 30,
    price_bdt: 1500,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { triggerToast } = useNotifications();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getPlans();
      setPlans(data || []);
    } catch (err) {
      console.error('Failed to load plans', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormState({
      name: '',
      description: '',
      duration_days: 30,
      price_bdt: 1500,
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormState({
      name: plan.name || '',
      description: plan.description || '',
      duration_days: plan.duration_days || 30,
      price_bdt: plan.price_bdt || 0,
      is_active: plan.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      alert('Plan name is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingPlan) {
        await subscriptionService.updatePlan(editingPlan.id, {
          name: formState.name.trim(),
          description: formState.description.trim(),
          duration_days: Number(formState.duration_days),
          price_bdt: Number(formState.price_bdt),
          is_active: formState.is_active,
        });
        triggerToast({
          id: Date.now(),
          title: 'Plan Updated',
          message: `Subscription plan '${formState.name}' updated successfully. Existing subscribers are unaffected.`,
          type: 'PAYMENT',
        });
      } else {
        await subscriptionService.createPlan({
          name: formState.name.trim(),
          description: formState.description.trim(),
          duration_days: Number(formState.duration_days),
          price_bdt: Number(formState.price_bdt),
          is_active: formState.is_active,
        });
        triggerToast({
          id: Date.now(),
          title: 'New Plan Created',
          message: `Plan '${formState.name}' is now live on the public pricing portal.`,
          type: 'PAYMENT',
        });
      }
      setModalOpen(false);
      loadPlans();
    } catch (err) {
      console.error('Save plan error', err);
      alert(err.response?.data?.detail || 'Failed to save subscription plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetirePlan = async (plan) => {
    if (
      !window.confirm(
        `Are you sure you want to retire '${plan.name}'? It will be hidden from new purchasers. Existing subscribers keep their active terms.`
      )
    ) {
      return;
    }
    try {
      await subscriptionService.deletePlan(plan.id);
      triggerToast({
        id: Date.now(),
        title: 'Plan Retired',
        message: `'${plan.name}' is now inactive.`,
        type: 'PAYMENT',
      });
      loadPlans();
    } catch (err) {
      console.error('Delete plan error', err);
      alert(err.response?.data?.detail || 'Failed to retire plan.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            Recruiter Subscription Plans
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create and adjust tier pricing, durations, and offerings. Changes never alter existing subscriber contracts.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Add New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
          Loading subscription tiers...
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Subscription Plans
          </h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create your first recruiter tier to enable public checkouts.
          </p>
          <Button size="sm" onClick={handleOpenCreate}>
            Create Plan
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-6 rounded-2xl border bg-white dark:bg-slate-900 flex flex-col justify-between shadow-sm transition-all ${
                plan.is_active
                  ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  : 'border-dashed border-slate-300 dark:border-slate-700 opacity-60'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      plan.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Retired'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px]">
                  {plan.description || 'Full recruiter hiring tier with customizable Stage-2 benchmarks.'}
                </p>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {plan.price_bdt.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-500">BDT</span>
                    <span className="text-[11px] text-slate-400">/ {plan.duration_days} Days</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Duration: <strong>{plan.duration_days} Days</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Includes 10 MCQs + 5 Written Stage-2 Tests</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(plan)}
                  className="text-xs flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>

                {plan.is_active && (
                  <button
                    onClick={() => handleRetirePlan(plan)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Retire
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => !submitting && setModalOpen(false)}
          title={editingPlan ? 'Edit Subscription Plan' : 'Create New Recruiter Plan'}
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Plan Name
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g. Basic Recruiter Monthly"
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Description / Highlights
              </label>
              <textarea
                rows={2}
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Brief summary of offerings and duration..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formState.duration_days}
                  onChange={(e) => setFormState({ ...formState, duration_days: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Price in BDT
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formState.price_bdt}
                  onChange={(e) => setFormState({ ...formState, price_bdt: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={formState.is_active}
                onChange={(e) => setFormState({ ...formState, is_active: e.target.checked })}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="is_active_toggle" className="font-semibold text-slate-700 dark:text-slate-300">
                Plan is active and visible for public checkout
              </label>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
              Note: Changing plan price or details applies to future purchases only. Active recruiters retain their existing expiration date.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {submitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
