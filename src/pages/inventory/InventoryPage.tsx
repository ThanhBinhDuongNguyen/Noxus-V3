import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  AlertTriangle,
  Boxes,
  Warehouse as WarehouseIcon,
  ArrowDownToLine,
  Lock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import type { InventoryItem, Warehouse } from '@/types';

interface InventoryPageProps {
  search: string;
}

interface InventoryRow extends InventoryItem {
  warehouses?: Warehouse;
  products?: { id: string; name: string; sku: string; safety_stock: number };
}

export function InventoryPage({ search }: InventoryPageProps) {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [{ data: inv, error: invErr }, { data: wh, error: whErr }] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*, warehouses(*), products(id, name, sku, safety_stock)')
          .order('updated_at', { ascending: false }),
        supabase.from('warehouses').select('*').order('priority'),
      ]);
      if (invErr) throw invErr;
      if (whErr) throw whErr;
      setItems((inv ?? []) as InventoryRow[]);
      setWarehouses(wh ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loi tai du lieu ton kho');
      setItems([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (warehouseFilter !== 'all' && item.warehouse_id !== warehouseFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.products?.name.toLowerCase().includes(q) ||
          item.products?.sku.toLowerCase().includes(q) ||
          item.warehouses?.name.toLowerCase().includes(q) ||
          item.warehouses?.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, warehouseFilter]);

  if (loading) return <FullPageSpinner label="Dang tai ton kho..." />;
  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertTriangle size={24} className="text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-800">Khong tai duoc du lieu ton kho</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button onClick={() => load()} className="btn-primary mt-4">Thu lai</button>
        </div>
      </div>
    );
  }

  const totalPhysical = items.reduce((s, i) => s + i.physical_qty, 0);
  const totalReserved = items.reduce((s, i) => s + i.reserved_qty, 0);
  const totalAvailable = items.reduce((s, i) => s + i.available_qty, 0);
  const totalIncoming = items.reduce((s, i) => s + i.incoming_qty, 0);
  const lowStockCount = items.filter((i) => {
    const safety = i.products?.safety_stock ?? i.safety_stock;
    return i.available_qty <= safety;
  }).length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Boxes} label="Thuc te" value={totalPhysical} iconBg="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle2} label="Co san" value={totalAvailable} iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Lock} label="Da giu" value={totalReserved} iconBg="bg-amber-50 text-amber-600" />
        <StatCard icon={ArrowDownToLine} label="Sap ve" value={totalIncoming} iconBg="bg-violet-50 text-violet-600" />
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{lowStockCount}</span> mat hang dang dat hoac duoi muc ton an toan — can bo sung.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterPill active={warehouseFilter === 'all'} onClick={() => setWarehouseFilter('all')}>
          Tat ca kho
        </FilterPill>
        {warehouses.map((w) => (
          <FilterPill
            key={w.id}
            active={warehouseFilter === w.id}
            onClick={() => setWarehouseFilter(w.id)}
          >
            {w.code} — {w.name}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={search ? 'Khong tim thay ton kho' : 'Chua co du lieu ton kho'}
            description={
              search
                ? 'Thu dieu chinh tim kiem hoac bo loc kho'
                : 'Du lieu ton kho se hien thi khi nhan hang'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">San pham</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Kho</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Thuc te</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Da giu</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Co san</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Kha dung</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Sap ve</th>
                  <th className="text-center px-5 py-3.5 font-semibold">Trang thai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((item) => {
                  const safety = item.products?.safety_stock ?? item.safety_stock;
                  const isLow = item.available_qty <= safety;
                  const isOut = item.available_qty <= 0;
                  return (
                    <tr key={item.id} className="hover:bg-ink-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center shrink-0 group-hover:bg-ink-200/50 transition-colors">
                            <Package size={16} className="text-ink-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-900 truncate">
                              {item.products?.name ?? 'San pham khong ro'}
                            </p>
                            <code className="text-xs text-ink-400 font-mono">
                              {item.products?.sku ?? '—'}
                            </code>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon size={14} className="text-ink-400" />
                          <span className="text-ink-700">{item.warehouses?.name ?? '—'}</span>
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">{item.warehouses?.code}</p>
                      </td>
                      <QtyCell value={item.physical_qty} />
                      <QtyCell value={item.reserved_qty} />
                      <QtyCell
                        value={item.available_qty}
                        warn={isOut ? 'danger' : isLow ? 'warning' : undefined}
                      />
                      <QtyCell value={item.unavailable_qty} muted />
                      <QtyCell value={item.incoming_qty} accent />
                      <td className="px-5 py-4 text-center">
                        {isOut ? (
                          <span className="badge bg-rose-100 text-rose-800 border-rose-200">
                            <XCircle size={12} /> Het
                          </span>
                        ) : isLow ? (
                          <span className="badge bg-amber-100 text-amber-800 border-amber-200">
                            <AlertTriangle size={12} /> Thap
                          </span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  iconBg: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-ink-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-ink-900 tabular-nums">{value.toLocaleString()}</p>
      </div>
    </Card>
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

function QtyCell({
  value,
  warn,
  muted,
  accent,
}: {
  value: number;
  warn?: 'danger' | 'warning';
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <td className="px-5 py-4 text-right">
      <span
        className={cn(
          'font-semibold tabular-nums',
          warn === 'danger'
            ? 'text-rose-600'
            : warn === 'warning'
              ? 'text-amber-600'
              : accent
                ? 'text-violet-600'
                : muted
                  ? 'text-ink-400'
                  : 'text-ink-800'
        )}
      >
        {value.toLocaleString()}
      </span>
    </td>
  );
}
