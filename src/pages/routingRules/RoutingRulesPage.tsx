import { useEffect, useState } from 'react';
import { Activity, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { RoutingRule, Warehouse, Channel } from '@/types';

interface RoutingRulesPageProps {
  search: string;
}

const CHANNEL_OPTIONS: { value: Channel | 'all'; label: string }[] = [
  { value: 'all', label: 'Tat ca kenh' },
  { value: 'website', label: 'Website' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'lazada', label: 'Lazada' },
];

const STRATEGY_LABELS: Record<string, string> = {
  nearest: 'Gan nhat',
  priority: 'Uu tien',
  most_stock: 'Nhieu ton nhat',
};

export function RoutingRulesPage({ search }: RoutingRulesPageProps) {
  const toast = useToast();
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const [rRes, wRes] = await Promise.all([
      supabase.from('routing_rules').select('*, warehouse:warehouses(*)').order('priority', { ascending: true }),
      supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
    ]);
    setRules((rRes.data as RoutingRule[]) ?? []);
    setWarehouses((wRes.data as Warehouse[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = rules.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  async function toggleActive(r: RoutingRule) {
    const { error } = await supabase.from('routing_rules').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) { toast('Cap nhat that bai', 'error'); return; }
    load();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('routing_rules').delete().eq('id', id);
    if (error) { toast('Xoa that bai', 'error'); return; }
    toast('Da xoa quy tac', 'success');
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-ink-900">Dinh tuyen kho ({filtered.length})</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary shrink-0"><Plus size={16} /> Them quy tac</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Activity} title="Chua co quy tac dinh tuyen" description="Cau hinh quy tac tu dong gan kho cho don hang" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-center px-4 py-3 font-semibold">Uu tien</th>
                <th className="text-left px-4 py-3 font-semibold">Ten quy tac</th>
                <th className="text-left px-4 py-3 font-semibold">Kenh</th>
                <th className="text-left px-4 py-3 font-semibold">Kho uu tien</th>
                <th className="text-left px-4 py-3 font-semibold">Chien luoc</th>
                <th className="text-center px-4 py-3 font-semibold">Trang thai</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 text-center"><span className="w-6 h-6 rounded-full bg-ink-100 text-ink-600 text-xs font-bold flex items-center justify-center mx-auto">{r.priority}</span></td>
                  <td className="px-4 py-3 font-medium text-ink-800">{r.name}</td>
                  <td className="px-4 py-3 text-ink-600 text-xs uppercase">{r.channel ?? 'tat ca'}</td>
                  <td className="px-4 py-3 text-ink-700">{r.warehouse?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600 text-xs">{STRATEGY_LABELS[r.strategy] ?? r.strategy}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => toggleActive(r)} className={`badge ${r.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-ink-100 text-ink-500 border-ink-200'}`}>{r.is_active ? 'Bat' : 'Tat'}</button></td>
                  <td className="px-2 py-3"><button onClick={() => handleDelete(r.id)} className="text-ink-400 hover:text-rose-500 p-1"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <NewRoutingModal warehouses={warehouses} onClose={() => setShowForm(false)} onSaved={() => { load(); setShowForm(false); }} />}
    </div>
  );

  function NewRoutingModal({ warehouses, onClose, onSaved }: { warehouses: Warehouse[]; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState('');
    const [priority, setPriority] = useState(1);
    const [channel, setChannel] = useState<string>('all');
    const [warehouseId, setWarehouseId] = useState('');
    const [strategy, setStrategy] = useState('priority');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      if (!name) { toast('Nhap ten quy tac', 'error'); return; }
      setSaving(true);
      const { error } = await supabase.from('routing_rules').insert({
        name, priority,
        channel: channel === 'all' ? null : channel,
        preferred_warehouse_id: warehouseId || null,
        strategy, is_active: true,
      });
      setSaving(false);
      if (error) { toast('Loi: ' + error.message, 'error'); return; }
      toast('Da them quy tac', 'success');
      onSaved();
    }

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header"><h3 className="font-semibold text-ink-900">Them quy tac dinh tuyen</h3></div>
          <div className="modal-body space-y-4">
            <div><label className="label">Ten quy tac *</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="VD: Uu tien kho chinh" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Uu tien</label><input type="number" min={1} value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 1)} className="input" /></div>
              <div><label className="label">Chien luoc</label><select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="input"><option value="priority">Uu tien</option><option value="nearest">Gan nhat</option><option value="most_stock">Nhieu ton nhat</option></select></div>
            </div>
            <div><label className="label">Kenh</label><select value={channel} onChange={(e) => setChannel(e.target.value)} className="input">{CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className="label">Kho uu tien</label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input"><option value="">Tu dong</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn-secondary">Huy</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null}<Save size={14} /> Luu</button>
          </div>
        </div>
      </div>
    );
  }
}
