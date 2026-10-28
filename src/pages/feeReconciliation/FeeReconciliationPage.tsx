import { useEffect, useState } from 'react';
import { Receipt, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OrderFeeBreakdown, Order } from '@/types';

interface FeeReconciliationPageProps {
  search: string;
}

export function FeeReconciliationPage({ search }: FeeReconciliationPageProps) {
  const toast = useToast();
  const [fees, setFees] = useState<OrderFeeBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('order_fee_breakdowns')
      .select('*, order:orders(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    setFees((data as OrderFeeBreakdown[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = fees.filter((f) =>
    !search || f.order?.order_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFees = filtered.reduce((s, f) => s + Number(f.commission_fee) + Number(f.transaction_fee) + Number(f.voucher_co_fund_fee) + Number(f.weight_penalty_fee), 0);
  const totalPayout = filtered.reduce((s, f) => s + Number(f.net_payout), 0);
  const unreconciled = filtered.filter((f) => !f.is_reconciled).length;
  const discrepancies = filtered.filter((f) => {
    const estShip = Number(f.estimated_shipping_fee);
    const actualShip = Number(f.actual_shipping_fee);
    return Math.abs(estShip - actualShip) > 0.01 && estShip > 0;
  });

  async function reconcile(id: string) {
    const { error } = await supabase.from('order_fee_breakdowns').update({ is_reconciled: true }).eq('id', id);
    if (error) { toast('Failed', 'error'); return; }
    toast('Reconciled', 'success');
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-ink-900">Fee Reconciliation ({filtered.length})</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Total Fees</p>
          <p className="text-xl font-bold text-rose-600">{formatCurrency(totalFees)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Net Payout</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPayout)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Unreconciled</p>
          <p className="text-xl font-bold text-amber-600">{unreconciled}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Shipping Discrepancies</p>
          <p className="text-xl font-bold text-rose-600">{discrepancies.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No fee breakdowns" description="Fee breakdowns appear when orders have channel fees" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-3 font-semibold">Order</th>
                <th className="text-right px-3 py-3 font-semibold">Commission</th>
                <th className="text-right px-3 py-3 font-semibold">Transaction</th>
                <th className="text-right px-3 py-3 font-semibold">Voucher</th>
                <th className="text-right px-3 py-3 font-semibold">Est. Ship</th>
                <th className="text-right px-3 py-3 font-semibold">Actual Ship</th>
                <th className="text-right px-3 py-3 font-semibold">Weight Penalty</th>
                <th className="text-right px-3 py-3 font-semibold">Net Payout</th>
                <th className="text-center px-3 py-3 font-semibold">Status</th>
                <th className="text-left px-3 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((f) => {
                const shipDiff = Math.abs(Number(f.estimated_shipping_fee) - Number(f.actual_shipping_fee));
                const hasDiscrepancy = shipDiff > 0.01 && Number(f.estimated_shipping_fee) > 0;
                return (
                  <tr key={f.id} className={`hover:bg-ink-50/50 ${hasDiscrepancy ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-3 py-3 font-medium text-ink-800">{f.order?.order_number ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.commission_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.transaction_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.voucher_co_fund_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.estimated_shipping_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">
                      {formatCurrency(Number(f.actual_shipping_fee))}
                      {hasDiscrepancy && <AlertTriangle size={12} className="inline ml-1 text-rose-500" />}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-rose-600">{formatCurrency(Number(f.weight_penalty_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-ink-900">{formatCurrency(Number(f.net_payout))}</td>
                    <td className="px-3 py-3 text-center">
                      {f.is_reconciled ? (
                        <CheckCircle size={16} className="text-emerald-500 inline" />
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800 border-amber-200">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {!f.is_reconciled && (
                        <button onClick={() => reconcile(f.id)} className="text-xs text-blue-600 hover:underline">Reconcile</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
