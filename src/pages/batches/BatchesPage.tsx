import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Smartphone,
  CalendarClock,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { SERIAL_STATUS_LABELS, SERIAL_STATUS_COLORS } from '@/lib/utils';
import type { InventoryBatch, InventorySerial, Warehouse, Product, SerialStatus } from '@/types';

interface BatchesPageProps {
  search: string;
}

interface BatchRow extends InventoryBatch {
  warehouse?: Warehouse;
  product?: Product;
}
interface SerialRow extends InventorySerial {
  warehouse?: Warehouse;
  product?: Product;
}

type Tab = 'batches' | 'serials';

export function BatchesPage({ search }: BatchesPageProps) {
  const [tab, setTab] = useState<Tab>('batches');
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [serials, setSerials] = useState<SerialRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase
        .from('inventory_batches')
        .select('*, warehouse:warehouses(*), product:products(*)')
        .order('expiry_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('inventory_serials')
        .select('*, warehouse:warehouses(*), product:products(*)')
        .order('created_at', { ascending: false }),
    ]);
    setBatches((b ?? []) as BatchRow[]);
    setSerials((s ?? []) as SerialRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredBatches = useMemo(() => {
    if (!search) return batches;
    const q = search.toLowerCase();
    return batches.filter(
      (b) =>
        b.batch_number.toLowerCase().includes(q) ||
        b.product?.name.toLowerCase().includes(q) ||
        b.product?.sku.toLowerCase().includes(q) ||
        b.warehouse?.name.toLowerCase().includes(q)
    );
  }, [batches, search]);

  const filteredSerials = useMemo(() => {
    if (!search) return serials;
    const q = search.toLowerCase();
    return serials.filter(
      (s) =>
        s.serial_number.toLowerCase().includes(q) ||
        s.product?.name.toLowerCase().includes(q) ||
        s.product?.sku.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [serials, search]);

  if (loading) return <FullPageSpinner label="Loading batches & serials..." />;

  const expiredCount = batches.filter(
    (b) => b.expiry_date && new Date(b.expiry_date) < new Date()
  ).length;
  const expiringSoon = batches.filter((b) => {
    if (!b.expiry_date) return false;
    const days = (new Date(b.expiry_date).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900 tracking-tight">Batches & Serials</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          FEFO batch tracking and serialized IMEI inventory
        </p>
      </div>

      {tab === 'batches' && (expiredCount > 0 || expiringSoon > 0) && (
        <div className="flex items-center gap-4">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5">
              <AlertTriangle size={16} className="text-rose-600" />
              <p className="text-sm text-rose-800">
                <span className="font-semibold">{expiredCount}</span> expired batch(es)
              </p>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <CalendarClock size={16} className="text-amber-600" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{expiringSoon}</span> expiring within 30 days
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <TabButton active={tab === 'batches'} onClick={() => setTab('batches')} icon={Boxes}>
          Batches ({batches.length})
        </TabButton>
        <TabButton active={tab === 'serials'} onClick={() => setTab('serials')} icon={Smartphone}>
          Serials ({serials.length})
        </TabButton>
      </div>

      {tab === 'batches' &&
        (filteredBatches.length === 0 ? (
          <Card>
            <EmptyState
              icon={Boxes}
              title={search ? 'No matching batches' : 'No batches yet'}
              description={
                search
                  ? 'Try adjusting your search'
                  : 'Inventory batches with expiry dates will appear here (FEFO ordering)'
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold">Batch #</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Product</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Warehouse</th>
                    <th className="text-right px-5 py-3.5 font-semibold">On Hand</th>
                    <th className="text-right px-5 py-3.5 font-semibold">Reserved</th>
                    <th className="text-right px-5 py-3.5 font-semibold">Unit Cost</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filteredBatches.map((b) => {
                    const isExpired =
                      b.expiry_date && new Date(b.expiry_date) < new Date();
                    const daysToExpiry = b.expiry_date
                      ? Math.floor((new Date(b.expiry_date).getTime() - Date.now()) / 86400000)
                      : null;
                    const isExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;
                    return (
                      <tr key={b.id} className="hover:bg-ink-50/50 transition-colors group">
                        <td className="px-5 py-4">
                          <code className="text-xs font-mono font-semibold text-ink-700 bg-ink-100 px-2 py-0.5 rounded">
                            {b.batch_number}
                          </code>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-ink-900">{b.product?.name ?? '—'}</p>
                          <code className="text-xs text-ink-400 font-mono">{b.product?.sku}</code>
                        </td>
                        <td className="px-5 py-4 text-ink-600">{b.warehouse?.name ?? '—'}</td>
                        <td className="px-5 py-4 text-right font-semibold tabular-nums text-ink-800">
                          {b.qty_on_hand}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-ink-500">
                          {b.qty_reserved}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-ink-600">
                          ${Number(b.import_unit_cost).toFixed(2)}
                        </td>
                        <td className="px-5 py-4">
                          {b.expiry_date ? (
                            <div className="flex items-center gap-1.5">
                              <CalendarClock
                                size={14}
                                className={cn(
                                  isExpired
                                    ? 'text-rose-500'
                                    : isExpiringSoon
                                      ? 'text-amber-500'
                                      : 'text-ink-400'
                                )}
                              />
                              <div>
                                <p
                                  className={cn(
                                    'text-sm font-medium',
                                    isExpired
                                      ? 'text-rose-600'
                                      : isExpiringSoon
                                        ? 'text-amber-600'
                                        : 'text-ink-700'
                                  )}
                                >
                                  {formatDate(b.expiry_date)}
                                </p>
                                {daysToExpiry !== null && (
                                  <p className="text-xs text-ink-400">
                                    {isExpired
                                      ? `${Math.abs(daysToExpiry)}d ago`
                                      : `in ${daysToExpiry}d`}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

      {tab === 'serials' &&
        (filteredSerials.length === 0 ? (
          <Card>
            <EmptyState
              icon={Smartphone}
              title={search ? 'No matching serials' : 'No serials yet'}
              description={
                search
                  ? 'Try adjusting your search'
                  : 'Serialized inventory (IMEI / serial numbers) will appear here'
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold">Serial Number</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Product</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Warehouse</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filteredSerials.map((s) => (
                    <tr key={s.id} className="hover:bg-ink-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Smartphone size={14} className="text-ink-400" />
                          <code className="text-xs font-mono font-semibold text-ink-700">
                            {s.serial_number}
                          </code>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink-900">{s.product?.name ?? '—'}</p>
                        <code className="text-xs text-ink-400 font-mono">{s.product?.sku}</code>
                      </td>
                      <td className="px-5 py-4 text-ink-600">{s.warehouse?.name ?? '—'}</td>
                      <td className="px-5 py-4">
                        <span className={cn('badge', SERIAL_STATUS_COLORS[s.status as SerialStatus])}>
                          {SERIAL_STATUS_LABELS[s.status as SerialStatus]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Package;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
        active
          ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
          : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
      )}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}
