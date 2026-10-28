import { useEffect, useMemo, useState } from 'react';
import {
  Waves,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  Package,
  Truck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/utils';
import { WAVE_STATUS_LABELS, WAVE_STATUS_COLORS } from '@/lib/utils';
import type {
  FulfillmentWave,
  Order,
  Warehouse,
  WaveStatus,
  OrderStatus,
} from '@/types';

interface FulfillmentPageProps {
  search: string;
}

interface WaveRow extends FulfillmentWave {
  warehouse?: Warehouse;
  orders?: Order[];
}

const WAVE_FLOW: WaveStatus[] = ['open', 'picking', 'packing', 'completed'];
const NEXT_WAVE_STATUS: Partial<Record<WaveStatus, WaveStatus>> = {
  open: 'picking',
  picking: 'packing',
  packing: 'completed',
};

export function FulfillmentPage({ search }: FulfillmentPageProps) {
  const toast = useToast();
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    const [{ data: w }, { data: wh }, { data: ord }] = await Promise.all([
      supabase
        .from('fulfillment_waves')
        .select('*, warehouse:warehouses(*)')
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').order('name'),
      supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .is('fulfillment_wave_id', null)
        .in('status', ['pending', 'processing'])
        .order('must_ship_by_sla', { ascending: true })
        .limit(50),
    ]);
    setWaves((w ?? []) as WaveRow[]);
    setWarehouses(wh ?? []);
    setUnassignedOrders((ord ?? []) as Order[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return waves.filter((w) => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          w.wave_code.toLowerCase().includes(q) ||
          w.warehouse?.name.toLowerCase().includes(q) ||
          w.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [waves, search, statusFilter]);

  function slaStatus(sla: string | null): 'ok' | 'warning' | 'critical' | 'none' {
    if (!sla) return 'none';
    const hours = (new Date(sla).getTime() - Date.now()) / 3600000;
    if (hours < 0) return 'critical';
    if (hours < 6) return 'critical';
    if (hours < 24) return 'warning';
    return 'ok';
  }

  function slaLabel(sla: string | null): string {
    if (!sla) return 'Khong SLA';
    const hours = (new Date(sla).getTime() - Date.now()) / 3600000;
    if (hours < 0) return `${Math.abs(Math.round(hours))}g qua han`;
    if (hours < 24) return `Con ${Math.round(hours)}g`;
    return `Con ${Math.floor(hours / 24)}n ${Math.round(hours % 24)}g`;
  }

  async function advanceWave(wave: FulfillmentWave) {
    const next = NEXT_WAVE_STATUS[wave.status];
    if (!next) return;
    const { error } = await supabase
      .from('fulfillment_waves')
      .update({ status: next })
      .eq('id', wave.id);
    if (error) {
      toast('Cap nhat wave that bai: ' + error.message, 'error');
      return;
    }
    toast(`Wave da chuyen sang ${WAVE_STATUS_LABELS[next]}`, 'success');
    load();
  }

  async function loadOrdersForWave(waveId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('fulfillment_wave_id', waveId)
      .order('must_ship_by_sla', { ascending: true });
    setWaves((prev) =>
      prev.map((w) => (w.id === waveId ? { ...w, orders: (data ?? []) as Order[] } : w))
    );
  }

  if (loading) return <FullPageSpinner label="Dang tai wave giao hang..." />;

  const slaBreaches = unassignedOrders.filter(
    (o) => slaStatus(o.must_ship_by_sla) === 'critical'
  ).length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Wave giao hang</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {waves.length} wave · {unassignedOrders.length} don chua gan
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Tao wave
        </button>
      </div>

      {slaBreaches > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertTriangle size={18} className="text-rose-600" />
          <p className="text-sm text-rose-800">
            <span className="font-semibold">{slaBreaches}</span> don chua gan vuot SLA — can tao wave ngay lap tuc.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          Tat ca
        </FilterPill>
        {WAVE_FLOW.map((s) => (
          <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {WAVE_STATUS_LABELS[s]}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Waves}
            title={search || statusFilter !== 'all' ? 'Khong tim thay wave' : 'Chua co wave nao'}
            description={
              search || statusFilter !== 'all'
                ? 'Thu dieu chinh tim kiem hoac bo loc trang thai'
                : 'Tao wave de gom don hang cho picking va packing'
            }
            action={
              !search && statusFilter === 'all' && (
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  <Plus size={16} /> Tao wave
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((wave) => {
            const isOpen = expanded[wave.id] ?? false;
            const next = NEXT_WAVE_STATUS[wave.status];
            return (
              <Card
                key={wave.id}
                className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300"
              >
                <button
                  onClick={() => {
                    const willOpen = !isOpen;
                    setExpanded((p) => ({ ...p, [wave.id]: willOpen }));
                    if (willOpen && !wave.orders) loadOrdersForWave(wave.id);
                  }}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-ink-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={18} className="text-ink-400" />
                    ) : (
                      <ChevronRight size={18} className="text-ink-400" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                      <Waves size={18} className="text-ink-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900">{wave.wave_code}</span>
                        <span className={cn('badge', WAVE_STATUS_COLORS[wave.status])}>
                          {WAVE_STATUS_LABELS[wave.status]}
                        </span>
                      </div>
                      <p className="text-sm text-ink-500 mt-0.5">
                        {wave.warehouse?.name} · {wave.order_count} don
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-400">{formatDateTime(wave.created_at)}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-100 p-5 animate-fade-in">
                    {(wave.orders ?? []).length === 0 ? (
                      <p className="text-sm text-ink-400 py-2">Chua co don hang nao duoc gan vao wave nay.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="text-ink-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="text-left py-2 font-semibold">Don hang</th>
                            <th className="text-left py-2 font-semibold">Khach hang</th>
                            <th className="text-left py-2 font-semibold">Trang thai</th>
                            <th className="text-left py-2 font-semibold">SLA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-50">
                          {(wave.orders ?? []).map((o) => {
                            const sla = slaStatus(o.must_ship_by_sla);
                            return (
                              <tr key={o.id} className="hover:bg-ink-50/50">
                                <td className="py-2.5">
                                  <span className="font-medium text-ink-900">{o.order_number}</span>
                                </td>
                                <td className="py-2.5 text-ink-600">
                                  {o.customer?.name ?? '—'}
                                </td>
                                <td className="py-2.5">
                                  <span className={cn('badge', ORDER_STATUS_COLORS[o.status as OrderStatus])}>
                                    {ORDER_STATUS_LABELS[o.status as OrderStatus]}
                                  </span>
                                </td>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <Clock
                                      size={14}
                                      className={cn(
                                        sla === 'critical'
                                          ? 'text-rose-500'
                                          : sla === 'warning'
                                            ? 'text-amber-500'
                                            : 'text-ink-400'
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        'text-xs font-medium',
                                        sla === 'critical'
                                          ? 'text-rose-600'
                                          : sla === 'warning'
                                            ? 'text-amber-600'
                                            : 'text-ink-600'
                                      )}
                                    >
                                      {slaLabel(o.must_ship_by_sla)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {next && (
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => advanceWave(wave)} className="btn-primary">
                          <Truck size={16} />
                          Chuyen sang {WAVE_STATUS_LABELS[next]}
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

      <WaveFormModal
        open={showForm}
        warehouses={warehouses}
        unassignedOrders={unassignedOrders}
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
  unassignedOrders: Order[];
  onClose: () => void;
  onSaved: () => void;
}

function WaveFormModal({ open, warehouses, unassignedOrders, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id ?? '');
      setSelectedOrders(new Set());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const whOrders = unassignedOrders.filter((o) => !o.assigned_warehouse_id || o.assigned_warehouse_id === warehouseId);

  function toggleOrder(id: string) {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!warehouseId) {
      toast('Vui long chon kho', 'error');
      return;
    }
    if (selectedOrders.size === 0) {
      toast('Chon it nhat mot don hang', 'error');
      return;
    }
    setSaving(true);
    const code = `WAVE-${Date.now().toString().slice(-8)}`;
    const { data: wave, error: wErr } = await supabase
      .from('fulfillment_waves')
      .insert({
        wave_code: code,
        warehouse_id: warehouseId,
        status: 'open',
        order_count: selectedOrders.size,
      })
      .select()
      .single();
    if (wErr) {
      toast('Tao wave that bai: ' + wErr.message, 'error');
      setSaving(false);
      return;
    }
    const { error: oErr } = await supabase
      .from('orders')
      .update({ fulfillment_wave_id: wave.id })
      .in('id', Array.from(selectedOrders));
    if (oErr) {
      toast('Wave da tao nhung gan don that bai: ' + oErr.message, 'error');
      setSaving(false);
      return;
    }
    toast(`Da tao wave voi ${selectedOrders.size} don`, 'success');
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tao wave giao hang moi"
      subtitle="Gom don chua gan de picking va packing"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Huy
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            Tao wave ({selectedOrders.size})
          </button>
        </>
      }
    >
      <div className="space-y-4">
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

        <div>
          <label className="label">
            Don chua gan ({whOrders.length} don)
          </label>
          {whOrders.length === 0 ? (
            <p className="text-sm text-ink-400 py-4 text-center bg-ink-50 rounded-lg">
              Khong co don chua gan cho kho nay.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-ink-200 rounded-lg divide-y divide-ink-100">
              {whOrders.map((o) => {
                const hours = o.must_ship_by_sla
                  ? (new Date(o.must_ship_by_sla).getTime() - Date.now()) / 3600000
                  : null;
                const critical = hours !== null && hours < 6;
                return (
                  <label
                    key={o.id}
                    className="flex items-center gap-3 p-3 hover:bg-ink-50/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(o.id)}
                      onChange={() => toggleOrder(o.id)}
                      className="w-4 h-4 rounded accent-[var(--brand-600)]"
                    />
                    <Package size={16} className="text-ink-400" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink-900 text-sm">{o.order_number}</p>
                      <p className="text-xs text-ink-400 truncate">
                        {o.customer?.name ?? 'Khach le'}
                      </p>
                    </div>
                    {o.must_ship_by_sla && (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          critical ? 'text-rose-600' : 'text-ink-500'
                        )}
                      >
                        <Clock size={12} className="inline mr-1" />
                        {formatDateTime(o.must_ship_by_sla)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
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
