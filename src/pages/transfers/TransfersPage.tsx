import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  ChevronDown,
  ChevronRight,
  Truck,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { TRANSFER_STATUS_LABELS, TRANSFER_STATUS_COLORS } from '@/lib/utils';
import type {
  StockTransfer,
  StockTransferItem,
  Warehouse,
  Product,
  TransferStatus,
} from '@/types';

interface TransfersPageProps {
  search: string;
}

interface TransferWithItems extends StockTransfer {
  stock_transfer_items?: (StockTransferItem & { product?: Product })[];
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
}

const FLOW: TransferStatus[] = ['requested', 'in_transit', 'received'];
const NEXT_STATUS: Partial<Record<TransferStatus, TransferStatus>> = {
  requested: 'in_transit',
  in_transit: 'received',
};

export function TransfersPage({ search }: TransfersPageProps) {
  const toast = useToast();
  const [transfers, setTransfers] = useState<TransferWithItems[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const [{ data: tr }, { data: wh }, { data: prod }] = await Promise.all([
      supabase
        .from('stock_transfers')
        .select(
          '*, from_warehouse:warehouses!from_warehouse_id(*), to_warehouse:warehouses!to_warehouse_id(*), stock_transfer_items(*, product:products(*))'
        )
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setTransfers((tr ?? []) as TransferWithItems[]);
    setWarehouses(wh ?? []);
    setProducts(prod ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return transfers;
    const q = search.toLowerCase();
    return transfers.filter(
      (t) =>
        t.transfer_number.toLowerCase().includes(q) ||
        t.from_warehouse?.name.toLowerCase().includes(q) ||
        t.to_warehouse?.name.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
    );
  }, [transfers, search]);

  async function advanceStatus(t: StockTransfer) {
    const next = NEXT_STATUS[t.status];
    if (!next) return;
    const { error } = await supabase
      .from('stock_transfers')
      .update({ status: next })
      .eq('id', t.id);
    if (error) {
      toast('Failed to update status: ' + error.message, 'error');
      return;
    }
    toast(`Transfer moved to ${TRANSFER_STATUS_LABELS[next]}`, 'success');
    load();
  }

  if (loading) return <FullPageSpinner label="Loading transfers..." />;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Stock Transfers</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} · Requested → In Transit → Received
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> New Transfer
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ArrowLeftRight}
            title={search ? 'No matching transfers' : 'No transfers yet'}
            description={
              search
                ? 'Try adjusting your search'
                : 'Create a stock transfer to move inventory between warehouses'
            }
            action={
              !search && (
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  <Plus size={16} /> New Transfer
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const isOpen = expanded[t.id] ?? false;
            const items = t.stock_transfer_items ?? [];
            const next = NEXT_STATUS[t.status];
            return (
              <Card
                key={t.id}
                className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300"
              >
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [t.id]: !isOpen }))}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-ink-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={18} className="text-ink-400" />
                    ) : (
                      <ChevronRight size={18} className="text-ink-400" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                      <Truck size={18} className="text-ink-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900">{t.transfer_number}</span>
                        <span className={cn('badge', TRANSFER_STATUS_COLORS[t.status])}>
                          {TRANSFER_STATUS_LABELS[t.status]}
                        </span>
                      </div>
                      <p className="text-sm text-ink-500 mt-0.5">
                        {t.from_warehouse?.name} → {t.to_warehouse?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-400">{items.length} item(s)</p>
                    <p className="text-xs text-ink-400 mt-0.5">{formatDateTime(t.created_at)}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-100 p-5 animate-fade-in">
                    <table className="w-full text-sm">
                      <thead className="text-ink-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="text-left py-2 font-semibold">Product</th>
                          <th className="text-left py-2 font-semibold">SKU</th>
                          <th className="text-right py-2 font-semibold">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-ink-50/50">
                            <td className="py-2.5 text-ink-800">{item.product?.name ?? '—'}</td>
                            <td className="py-2.5">
                              <code className="text-xs text-ink-400 font-mono">
                                {item.product?.sku ?? '—'}
                              </code>
                            </td>
                            <td className="py-2.5 text-right font-semibold tabular-nums text-ink-800">
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {next && (
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => advanceStatus(t)} className="btn-primary">
                          <CheckCircle2 size={16} />
                          Mark as {TRANSFER_STATUS_LABELS[next]}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <TransferFormModal
        open={showForm}
        warehouses={warehouses}
        products={products}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />
    </div>
  );
}

interface FormProps {
  open: boolean;
  warehouses: Warehouse[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

function TransferFormModal({ open, warehouses, products, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ product_id: string; quantity: number }[]>([]);

  useEffect(() => {
    if (open) {
      setFromId(warehouses[0]?.id ?? '');
      setToId(warehouses[1]?.id ?? '');
      setNotes('');
      setLines([{ product_id: products[0]?.id ?? '', quantity: 1 }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function addLine() {
    setLines([...lines, { product_id: products[0]?.id ?? '', quantity: 1 }]);
  }
  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, patch: Partial<{ product_id: string; quantity: number }>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    if (!fromId || !toId) {
      toast('Select source and destination warehouses', 'error');
      return;
    }
    if (fromId === toId) {
      toast('Source and destination must differ', 'error');
      return;
    }
    const validLines = lines.filter((l) => l.product_id && l.quantity > 0);
    if (validLines.length === 0) {
      toast('Add at least one item', 'error');
      return;
    }
    setSaving(true);
    const number = `TR-${Date.now().toString().slice(-8)}`;
    const { data: transfer, error: tErr } = await supabase
      .from('stock_transfers')
      .insert({
        transfer_number: number,
        from_warehouse_id: fromId,
        to_warehouse_id: toId,
        status: 'requested',
        notes: notes.trim() || null,
      })
      .select()
      .single();
    if (tErr) {
      toast('Failed to create transfer: ' + tErr.message, 'error');
      setSaving(false);
      return;
    }
    const items = validLines.map((l) => ({
      transfer_id: transfer.id,
      product_id: l.product_id,
      quantity: l.quantity,
    }));
    const { error: iErr } = await supabase.from('stock_transfer_items').insert(items);
    if (iErr) {
      toast('Transfer created but items failed: ' + iErr.message, 'error');
      setSaving(false);
      return;
    }
    toast('Transfer created', 'success');
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Stock Transfer"
      subtitle="Move inventory between warehouses"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            Create Transfer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">From Warehouse</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">To Warehouse</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Items</label>
            <button onClick={addLine} className="btn-ghost text-xs px-2 py-1">
              <Plus size={14} /> Add Line
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={line.product_id}
                  onChange={(e) => updateLine(idx, { product_id: e.target.value })}
                  className="input flex-1"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(idx, { quantity: parseInt(e.target.value) || 0 })
                  }
                  className="input w-24 text-center"
                />
                <button
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  className="p-2 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-30"
                >
                  <Package size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes..."
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}
