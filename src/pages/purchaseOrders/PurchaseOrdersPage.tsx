import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Package,
  Calendar,
  Truck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '@/lib/utils';
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  Warehouse,
  Product,
  POStatus,
} from '@/types';

interface PurchaseOrdersPageProps {
  search: string;
}

interface POWithItems extends PurchaseOrder {
  warehouse?: Warehouse;
  purchase_order_items?: (PurchaseOrderItem & { product?: Product })[];
}

const STATUS_OPTIONS: POStatus[] = ['draft', 'ordered', 'partial', 'received', 'cancelled'];

export function PurchaseOrdersPage({ search }: PurchaseOrdersPageProps) {
  const toast = useToast();
  const [orders, setOrders] = useState<POWithItems[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const [{ data: po }, { data: wh }, { data: prod }] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('*, warehouse:warehouses(*), purchase_order_items(*, product:products(*))')
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setOrders((po ?? []) as POWithItems[]);
    setWarehouses(wh ?? []);
    setProducts(prod ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((po) => {
      if (statusFilter !== 'all' && po.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          po.po_number.toLowerCase().includes(q) ||
          po.supplier_name.toLowerCase().includes(q) ||
          po.warehouse?.name.toLowerCase().includes(q) ||
          po.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  if (loading) return <FullPageSpinner label="Dang tai don mua hang..." />;

  const totalValue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingCount = orders.filter((o) => o.status === 'ordered' || o.status === 'partial').length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Don mua hang</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {orders.length} don · {pendingCount} dang cho · {formatCurrency(totalValue)} tong gia tri
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Tao PO
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          Tat ca
        </FilterPill>
        {STATUS_OPTIONS.map((s) => (
          <FilterPill
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {PO_STATUS_LABELS[s]}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title={search || statusFilter !== 'all' ? 'Khong tim thay don mua hang' : 'Chua co don mua hang'}
            description={
              search || statusFilter !== 'all'
                ? 'Thu dieu chinh tim kiem hoac bo loc trang thai'
                : 'Tao don mua hang de nhap hang tu nha cung cap'
            }
            action={
              !search && statusFilter === 'all' && (
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  <Plus size={16} /> Tao PO
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((po) => {
            const isOpen = expanded[po.id] ?? false;
            const items = po.purchase_order_items ?? [];
            return (
              <Card
                key={po.id}
                className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300"
              >
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [po.id]: !isOpen }))}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-ink-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={18} className="text-ink-400" />
                    ) : (
                      <ChevronRight size={18} className="text-ink-400" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                      <ShoppingCart size={18} className="text-ink-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900">{po.po_number}</span>
                        <span className={cn('badge', PO_STATUS_COLORS[po.status])}>
                          {PO_STATUS_LABELS[po.status]}
                        </span>
                      </div>
                      <p className="text-sm text-ink-500 mt-0.5">
                        {po.supplier_name} · {po.warehouse?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink-900 tabular-nums">
                      {formatCurrency(Number(po.total_amount))}
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {po.expected_arrival_date ? (
                        <span className="flex items-center justify-end gap-1">
                          <Calendar size={12} /> {formatDate(po.expected_arrival_date)}
                        </span>
                      ) : (
                        'Chua co ETA'
                      )}
                    </p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-100 p-5 animate-fade-in">
                    <table className="w-full text-sm">
                      <thead className="text-ink-500 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="text-left py-2 font-semibold">San pham</th>
                          <th className="text-right py-2 font-semibold">Dat</th>
                          <th className="text-right py-2 font-semibold">Da nhan</th>
                          <th className="text-right py-2 font-semibold">Don gia</th>
                          <th className="text-right py-2 font-semibold">Thanh tien</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-ink-50/50">
                            <td className="py-2.5">
                              <p className="text-ink-800">{item.product?.name ?? '—'}</p>
                              <code className="text-xs text-ink-400 font-mono">
                                {item.product?.sku}
                              </code>
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-ink-700">
                              {item.quantity}
                            </td>
                            <td className="py-2.5 text-right tabular-nums">
                              <span
                                className={cn(
                                  item.received_qty >= item.quantity
                                    ? 'text-emerald-600 font-semibold'
                                    : item.received_qty > 0
                                      ? 'text-amber-600 font-semibold'
                                      : 'text-ink-400'
                                )}
                              >
                                {item.received_qty}
                              </span>
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-ink-600">
                              {formatCurrency(Number(item.unit_cost))}
                            </td>
                            <td className="py-2.5 text-right tabular-nums font-semibold text-ink-800">
                              {formatCurrency(Number(item.unit_cost) * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {po.notes && (
                      <p className="mt-3 text-sm text-ink-500 italic border-t border-ink-50 pt-3">
                        {po.notes}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <POFormModal
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

function POFormModal({ open, warehouses, products, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [leadTime, setLeadTime] = useState(7);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([]);

  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id ?? '');
      setSupplier('');
      setLeadTime(7);
      setNotes('');
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setExpectedDate(today.toISOString().slice(0, 10));
      setLines([{ product_id: products[0]?.id ?? '', quantity: 1, unit_cost: 0 }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function addLine() {
    const prod = products[lines.length] ?? products[0];
    setLines([
      ...lines,
      { product_id: prod?.id ?? '', quantity: 1, unit_cost: Number(prod?.cost ?? 0) },
    ]);
  }
  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }
  function updateLine(
    idx: number,
    patch: Partial<{ product_id: string; quantity: number; unit_cost: number }>
  ) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  async function handleSave() {
    if (!warehouseId) {
      toast('Vui long chon kho', 'error');
      return;
    }
    if (!supplier.trim()) {
      toast('Vui long nhap ten nha cung cap', 'error');
      return;
    }
    const validLines = lines.filter((l) => l.product_id && l.quantity > 0 && l.unit_cost >= 0);
    if (validLines.length === 0) {
      toast('Them it nhat mot dong san pham', 'error');
      return;
    }
    setSaving(true);
    const number = `PO-${Date.now().toString().slice(-8)}`;
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: number,
        warehouse_id: warehouseId,
        supplier_name: supplier.trim(),
        lead_time_days: Number(leadTime) || 7,
        status: 'draft',
        expected_arrival_date: expectedDate || null,
        total_amount: total,
        notes: notes.trim() || null,
      })
      .select()
      .single();
    if (poErr) {
      toast('Tao PO that bai: ' + poErr.message, 'error');
      setSaving(false);
      return;
    }
    const items = validLines.map((l) => ({
      po_id: po.id,
      product_id: l.product_id,
      quantity: l.quantity,
      unit_cost: l.unit_cost,
      received_qty: 0,
    }));
    const { error: iErr } = await supabase.from('purchase_order_items').insert(items);
    if (iErr) {
      toast('PO da tao nhung them san pham that bai: ' + iErr.message, 'error');
      setSaving(false);
      return;
    }
    toast('Da tao don mua hang', 'success');
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tao don mua hang moi"
      subtitle="Tao PO nhap voi danh sach san pham"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Huy
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            Tao PO · {formatCurrency(total)}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Ten nha cung cap *</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Nha cung cap ABC"
              className="input"
            />
          </div>
          <div>
            <label className="label">Kho</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Thoi gian giao (ngay)</label>
            <input
              type="number"
              min={1}
              value={leadTime}
              onChange={(e) => setLeadTime(parseInt(e.target.value) || 7)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Ngay du kien nhan</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Danh sach san pham</label>
            <button onClick={addLine} className="btn-ghost text-xs px-2 py-1">
              <Plus size={14} /> Them dong
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={line.product_id}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    updateLine(idx, {
                      product_id: e.target.value,
                      unit_cost: prod ? Number(prod.cost) : line.unit_cost,
                    });
                  }}
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
                  onChange={(e) => updateLine(idx, { quantity: parseInt(e.target.value) || 0 })}
                  className="input w-20 text-center"
                  placeholder="SL"
                />
                <input
                  type="number"
                  step="1000"
                  min={0}
                  value={line.unit_cost}
                  onChange={(e) => updateLine(idx, { unit_cost: parseFloat(e.target.value) || 0 })}
                  className="input w-24 text-center"
                  placeholder="Gia"
                />
                <span className="text-sm font-semibold tabular-nums text-ink-700 w-20 text-right">
                  {formatCurrency(line.quantity * line.unit_cost)}
                </span>
                <button
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  className="p-2 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Ghi chu</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ghi chu tuy chon..."
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
        active
          ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
          : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
      )}
    >
      {children}
    </button>
  );
}
