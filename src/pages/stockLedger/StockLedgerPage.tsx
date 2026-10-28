import { useEffect, useMemo, useState } from 'react';
import { ScrollText, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import {
  INVENTORY_TXN_TYPE_LABELS,
  INVENTORY_TXN_TYPE_COLORS,
} from '@/lib/utils';
import type { Warehouse, InventoryTxnType } from '@/types';

interface StockLedgerPageProps {
  search: string;
}

interface TxnRow {
  id: string;
  warehouse_id: string;
  product_id: string;
  batch_id: string | null;
  type: InventoryTxnType;
  quantity_delta: number;
  balance_after: number;
  reference_id: string | null;
  reason: string | null;
  created_by: string;
  created_at: string;
  product?: { id: string; name: string; sku: string };
  warehouse?: Warehouse;
}

const TXN_TYPES: InventoryTxnType[] = [
  'inbound',
  'outbound',
  'transfer_out',
  'transfer_in',
  'adjustment',
  'reservation',
  'release',
  'scrap',
  'return_in',
];

export function StockLedgerPage({ search }: StockLedgerPageProps) {
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [whFilter, setWhFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: w }] = await Promise.all([
      supabase
        .from('stock_transactions')
        .select('*, product:products(id, name, sku), warehouse:warehouses(*)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('warehouses').select('*').order('name'),
    ]);
    setTxns((t ?? []) as TxnRow[]);
    setWarehouses(w ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (whFilter !== 'all' && t.warehouse_id !== whFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.product?.name.toLowerCase().includes(q) ||
          t.product?.sku.toLowerCase().includes(q) ||
          t.reason?.toLowerCase().includes(q) ||
          t.reference_id?.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [txns, search, typeFilter, whFilter]);

  if (loading) return <FullPageSpinner label="Loading stock ledger..." />;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900 tracking-tight">Stock Ledger</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Immutable transaction history · {txns.length} record{txns.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-ink-400" />
          <span className="text-sm font-medium text-ink-600">Type</span>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-auto min-w-[160px]"
        >
          <option value="all">All Types</option>
          {TXN_TYPES.map((t) => (
            <option key={t} value={t}>
              {INVENTORY_TXN_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-2">
          <Search size={15} className="text-ink-400" />
          <span className="text-sm font-medium text-ink-600">Warehouse</span>
        </div>
        <select
          value={whFilter}
          onChange={(e) => setWhFilter(e.target.value)}
          className="input w-auto min-w-[160px]"
        >
          <option value="all">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ScrollText}
            title={search || typeFilter !== 'all' || whFilter !== 'all' ? 'No matching transactions' : 'No transactions yet'}
            description={
              search || typeFilter !== 'all' || whFilter !== 'all'
                ? 'Try adjusting your filters or search'
                : 'Stock movements will be recorded here as an immutable ledger'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">Timestamp</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Type</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Product</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Warehouse</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Δ Qty</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Balance</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Reference</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((t) => {
                  const delta = Number(t.quantity_delta);
                  const positive = delta > 0;
                  return (
                    <tr key={t.id} className="hover:bg-ink-50/50 transition-colors group">
                      <td className="px-5 py-3.5 text-ink-500 whitespace-nowrap">
                        {formatDateTime(t.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            'badge',
                            INVENTORY_TXN_TYPE_COLORS[t.type as InventoryTxnType]
                          )}
                        >
                          {INVENTORY_TXN_TYPE_LABELS[t.type as InventoryTxnType]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink-900 truncate max-w-[180px]">
                          {t.product?.name ?? '—'}
                        </p>
                        <code className="text-xs text-ink-400 font-mono">{t.product?.sku}</code>
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">
                        {t.warehouse?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            positive ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-ink-600'
                          )}
                        >
                          {positive ? '+' : ''}
                          {delta.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-semibold tabular-nums text-ink-800">
                          {Number(t.balance_after).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {t.reference_id ? (
                          <code className="text-xs text-ink-500 font-mono bg-ink-100 px-1.5 py-0.5 rounded">
                            {t.reference_id.length > 16
                              ? t.reference_id.slice(0, 8) + '…'
                              : t.reference_id}
                          </code>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-500 truncate max-w-[200px]">
                        {t.reason ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length >= 500 && (
            <div className="px-5 py-3 border-t border-ink-100 bg-ink-50/50 text-center">
              <p className="text-xs text-ink-400">
                Showing latest 500 transactions. Apply filters to narrow results.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
