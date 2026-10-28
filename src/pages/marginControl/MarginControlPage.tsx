import { useEffect, useState } from 'react';
import { BadgePercent, Shield, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import type { MarginConfig } from '@/types';

export function MarginControlPage() {
  const toast = useToast();
  const [config, setConfig] = useState<MarginConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heldOrders, setHeldOrders] = useState<{ id: string; order_number: string; total: number; hold_reason: string | null }[]>([]);

  async function load() {
    setLoading(true);
    const [cRes, oRes] = await Promise.all([
      supabase.from('margin_config').select('*').limit(1).maybeSingle(),
      supabase.from('orders').select('id, order_number, total, hold_reason').not('hold_reason', 'is', null),
    ]);
    setConfig(cRes.data as MarginConfig | null);
    setHeldOrders(oRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase.from('margin_config').update({
      min_margin_percent: config.min_margin_percent,
      max_loss_per_order: config.max_loss_per_order,
      circuit_breaker_enabled: config.circuit_breaker_enabled,
      auto_zero_stock_on_trigger: config.auto_zero_stock_on_trigger,
    }).eq('id', config.id);
    setSaving(false);
    if (error) { toast('Failed to save', 'error'); return; }
    toast('Margin config updated', 'success');
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>;
  if (!config) return <div className="p-6"><p className="text-ink-500">No margin config found.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
          <BadgePercent size={24} className="text-rose-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Margin Circuit Breaker</h2>
          <p className="text-sm text-ink-500">Auto-shutoff when negative margin detected (FR-35)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-ink-500" />
            <h3 className="font-semibold text-ink-800">Configuration</h3>
          </div>

          <div>
            <label className="label">Minimum Margin Percent</label>
            <input type="number" step="0.01" value={config.min_margin_percent}
              onChange={(e) => setConfig({ ...config, min_margin_percent: parseFloat(e.target.value) || 0 })}
              className="input" />
            <p className="text-xs text-ink-400 mt-1">Orders below this margin are flagged</p>
          </div>

          <div>
            <label className="label">Max Loss Per Order</label>
            <input type="number" step="0.01" value={config.max_loss_per_order}
              onChange={(e) => setConfig({ ...config, max_loss_per_order: parseFloat(e.target.value) || 0 })}
              className="input" />
            <p className="text-xs text-ink-400 mt-1">Circuit breaker triggers at this loss threshold</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={config.circuit_breaker_enabled}
                onChange={(e) => setConfig({ ...config, circuit_breaker_enabled: e.target.checked })}
                className="w-4 h-4 rounded border-ink-300" />
              <span className="text-sm text-ink-700">Circuit Breaker Enabled</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={config.auto_zero_stock_on_trigger}
                onChange={(e) => setConfig({ ...config, auto_zero_stock_on_trigger: e.target.checked })}
                className="w-4 h-4 rounded border-ink-300" />
              <span className="text-sm text-ink-700">Auto-Zero Stock on Trigger</span>
            </label>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? <Spinner size={16} /> : null} Save Configuration
          </button>
        </div>

        {/* Held Orders */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" />
            <h3 className="font-semibold text-ink-800">Margin-Held Orders ({heldOrders.length})</h3>
          </div>

          {heldOrders.length === 0 ? (
            <div className="text-center py-8">
              <Zap size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm text-ink-500">No orders on margin hold. All clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {heldOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{o.order_number}</p>
                    <p className="text-xs text-rose-600 capitalize">{o.hold_reason?.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-sm font-semibold text-ink-900 tabular-nums">{formatCurrency(Number(o.total))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
