import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building,
  Save,
  CheckCircle2,
  RefreshCw,
  PhoneCall,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { useNotifications } from '../../context/NotificationContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function PaymentSettings() {
  const [settings, setSettings] = useState({
    bkash_number: '',
    nagad_number: '',
    rocket_number: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_routing: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { triggerToast } = useNotifications();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getAdminPaymentSettings();
      if (data) {
        setSettings({
          bkash_number: data.bkash_number || '',
          nagad_number: data.nagad_number || '',
          rocket_number: data.rocket_number || '',
          bank_name: data.bank_name || '',
          bank_account_name: data.bank_account_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_routing: data.bank_routing || '',
        });
      }
    } catch (err) {
      console.error('Failed to load payment settings', err);
      triggerToast({
        id: Date.now(),
        title: 'Settings Load Error',
        message: 'Could not fetch system payment settings.',
        type: 'SYSTEM',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await subscriptionService.updateAdminPaymentSettings(settings);
      triggerToast({
        id: Date.now(),
        title: 'Payment Settings Saved!',
        message: 'Mobile financial service numbers and corporate bank details updated successfully.',
        type: 'PAYMENT',
      });
    } catch (err) {
      console.error('Failed to update payment settings', err);
      alert(err.response?.data?.detail || 'Failed to update payment credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            System Payment Gateway Credentials
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure the public receiver accounts for bKash, Nagad, Rocket, and Electronic Bank Transfers.
            These numbers are shown directly to candidates and recruiters on the checkout screen.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
            Loading system payment configuration...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Mobile Financial Services (MFS) Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-500" /> Mobile Banking Accounts (Personal / Send Money)
              </h3>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    bKash Personal Number
                  </label>
                  <input
                    type="text"
                    name="bkash_number"
                    value={settings.bkash_number}
                    onChange={handleChange}
                    placeholder="e.g. 01700000000"
                    required
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-400">Personal / Send Money wallet</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nagad Personal Number
                  </label>
                  <input
                    type="text"
                    name="nagad_number"
                    value={settings.nagad_number}
                    onChange={handleChange}
                    placeholder="e.g. 01800000000"
                    required
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-400">Personal / Send Money wallet</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rocket Wallet Number
                  </label>
                  <input
                    type="text"
                    name="rocket_number"
                    value={settings.rocket_number}
                    onChange={handleChange}
                    placeholder="e.g. 01900000000"
                    required
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-400">Personal / Pay Bill wallet</span>
                </div>
              </div>
            </div>

            {/* Corporate Bank Transfer Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-500" /> Corporate Bank Transfer Details (BEFTN / NPSB)
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={settings.bank_name}
                    onChange={handleChange}
                    placeholder="e.g. City Bank Limited"
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Beneficiary Account Name
                  </label>
                  <input
                    type="text"
                    name="bank_account_name"
                    value={settings.bank_account_name}
                    onChange={handleChange}
                    placeholder="e.g. ResumeAI Solutions Ltd."
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={settings.bank_account_number}
                    onChange={handleChange}
                    placeholder="e.g. 1102938475001"
                    required
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Branch Routing Number
                  </label>
                  <input
                    type="text"
                    name="bank_routing"
                    value={settings.bank_routing}
                    onChange={handleChange}
                    placeholder="e.g. 085273149"
                    required
                    className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Changes take effect immediately across all user checkout portals.
              </span>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-md"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Gateway Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
