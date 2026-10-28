import { useEffect, useState } from 'react';
import { ShieldAlert, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import type { BufferRule, Warehouse, Product } from '@/types';

interface BufferRulesPageProps {
  search: string;
}

export function BufferRulesPage({ search }: BufferRulesPageProps) {
  const toast = useToast();
  const [rules, setRules] = useState<BufferRule[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [rRes, wRes, pRes] = await Promise.all([
      supabase.from('buffer_rules').select('*, warehouse:warehouses(*), product:products(*)').order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
      supabase.from('products').select('id, name, sku').order('name'),
    ]);
    setRules((rRes.data as BufferRule[]) ?? []);
    setWarehouses((wRes.data as Warehouse[]) ?? []);
    setProducts((pRes.data as Product[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = rules.filter((r) =>
    !search || r.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.product?.sku?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('buffer_rules').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) { toast('Xoa that bai', 'error'); return; }
    toast('Da xoa quy tac', 'success');
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-ink-900">Ton kho an toan ({filtered.length})</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary shrink-0"><Plus size={16} /> Them quy tac</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Chua co quy tac ton kho an toan" description="Cau hinh safety stock va reorder point cho tung SKU" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Kho</th>
                <th className="text-left px-4 py-3 font-semibold">San pham</th>
                <th className="text-center px-4 py-3 font-semibold">Safety Stock</th>
                <th className="text-center px-4 py-3 font-semibold">Reorder Point</th>
                <th className="text-center px-4 py-3 font-semibold">Push Ratio</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 text-ink-700">{r.warehouse?.name ?? '—'}</td>
                  <td className="px-4 py-3"><p className="font-medium text-ink-800">{r.product?.name ?? '—'}</p><p className="text-xs text-ink-400">{r.product?.sku}</p></td>
                  <td className="px-4 py-3 text-center tabular-nums font-semibold text-amber-700">{r.safety_stock}</td>
                  <td className="px-4 py-3 text-center tabular-nums font-semibold text-rose-700">{r.reorder_point}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{r.push_ratio_percent}%</td>
                  <td className="px-2 py-3"><button onClick={() => setDeleteId(r.id)} className="text-ink-400 hover:text-rose-500 p-1"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <NewBufferModal warehouses={warehouses} products={products} onClose={() => setShowForm(false)} onSaved={() => { load(); setShowForm(false); }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Xoa quy tac?" message="Quy tac ton kho an toan nay se bi xoa vinh vien." confirmLabel="Xoa" />
    </div>
  );

  function NewBufferModal({ warehouses, products, onClose, onSaved }: { warehouses: Warehouse[]; products: Product[]; onClose: () => void; onSaved: () => void }) {
    const [warehouseId, setWarehouseId] = useState('');
    const [productId, setProductId] = useState('');
    const [safetyStock, setSafetyStock] = useState(5);
    const [reorderPoint, setReorderPoint] = useState(10);
    const [pushRatio, setPushRatio] = useState(100);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      if (!warehouseId || !productId) { toast('Chon kho va san pham', 'error'); return; }
      if (safetyStock < 0 || reorderPoint < 0 || pushRatio < 0 || pushRatio > 100) { toast('Gia tri khong hop le', 'error'); return; }
      setSaving(true);
      const { error } = await supabase.from('buffer_rules').insert({
        warehouse_id: warehouseId, product_id: productId,
        safety_stock: safetyStock, reorder_point: reorderPoint, push_ratio_percent: pushRatio,
      });
      setSaving(false);
      if (error) { toast('Loi: ' + error.message, 'error'); return; }
      toast('Da them quy tac', 'success');
      onSaved();
    }

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header"><h3 className="font-semibold text-ink-900">Them quy tac ton kho an toan</h3></div>
          <div className="modal-body space-y-4">
            <div><label className="label">Kho *</label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input"><option value="">Chon kho...</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div><label className="label">San pham *</label><select value={productId} onChange={(e) => setProductId(e.target.value)} className="input"><option value="">Chon san pham...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Safety Stock</label><input type="number" min={0} value={safetyStock} onChange={(e) => setSafetyStock(parseInt(e.target.value) || 0)} className="input" /></div>
              <div><label className="label">Reorder Point</label><input type="number" min={0} value={reorderPoint} onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)} className="input" /></div>
              <div><label className="label">Push Ratio %</label><input type="number" min={0} max={100} value={pushRatio} onChange={(e) => setPushRatio(parseInt(e.target.value) || 0)} className="input" /></div>
            </div>
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
