import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Calendar, Download, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportOrdersToExcel, exportOrdersToPDF } from '@/lib/export';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { Order } from '@/types';

type Period = 'day' | 'month' | 'year';

interface Bucket {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  avgOrder: number;
}

export function RevenueReportPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('day');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .neq('status', 'cancelled')
        .order('placed_at', { ascending: false });
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    }
    load();
  }, []);

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();

    for (const o of orders) {
      if (!o.placed_at) continue;
      const d = new Date(o.placed_at);
      let key: string;
      let label: string;

      if (period === 'day') {
        key = d.toISOString().slice(0, 10);
        label = formatDate(key);
      } else if (period === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthNames = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];
        label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        key = String(d.getFullYear());
        label = `Nam ${d.getFullYear()}`;
      }

      const existing = map.get(key);
      if (existing) {
        existing.revenue += Number(o.total);
        existing.orders += 1;
      } else {
        map.set(key, { key, label, revenue: Number(o.total), orders: 1, avgOrder: 0 });
      }
    }

    const result = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    for (const b of result) b.avgOrder = b.orders > 0 ? b.revenue / b.orders : 0;
    return result;
  }, [orders, period]);

  const totalRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
  const totalOrders = buckets.reduce((s, b) => s + b.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const maxRevenue = Math.max(...buckets.map((b) => b.revenue), 1);

  if (loading) return <FullPageSpinner label="Dang tai bao cao..." />;

  const recentOrders = orders.slice(0, 20);

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Bao cao doanh thu</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Phan tich doanh thu chi tiet theo ngay, thang va nam
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportOrdersToExcel(orders)}
            className="btn-secondary text-sm"
          >
            <Download size={16} /> Xuat Excel
          </button>
          <button
            onClick={() => exportOrdersToPDF(orders)}
            className="btn-secondary text-sm"
          >
            <Download size={16} /> Xuat PDF
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-ink-400" />
        {(['day', 'month', 'year'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
              period === p
                ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
            )}
          >
            {p === 'day' ? 'Theo ngay' : p === 'month' ? 'Theo thang' : 'Theo nam'}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-ink-400 font-medium">Tong doanh thu</p>
              <p className="text-xl font-bold text-ink-900 tabular-nums">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-xs text-ink-400 font-medium">Tong so don hang</p>
              <p className="text-xl font-bold text-ink-900 tabular-nums">{totalOrders.toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-ink-400 font-medium">Gia tri trung binh/don</p>
              <p className="text-xl font-bold text-ink-900 tabular-nums">{formatCurrency(avgOrderValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bar chart */}
      {buckets.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-ink-900 mb-1">Bieu do doanh thu</h3>
          <p className="text-sm text-ink-400 mb-6">
            {period === 'day' ? 'Doanh thu theo ngay' : period === 'month' ? 'Doanh thu theo thang' : 'Doanh thu theo nam'}
          </p>
          <div className="space-y-2.5">
            {buckets.slice(-30).map((b) => (
              <div key={b.key} className="flex items-center gap-3 group">
                <div className="w-28 text-xs text-ink-500 font-medium text-right shrink-0 truncate">
                  {b.label}
                </div>
                <div className="flex-1 relative h-7 bg-ink-50 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-brand-600 rounded-lg transition-all duration-500 group-hover:from-brand-500 group-hover:to-brand-700"
                    style={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-semibold text-white drop-shadow-sm" style={{ opacity: (b.revenue / maxRevenue) > 0.15 ? 1 : 0 }}>
                      {formatCurrency(b.revenue)}
                    </span>
                    <span className="text-xs font-medium text-ink-500">
                      {b.orders} don
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Data table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <h3 className="text-base font-semibold text-ink-900">Bang chi tiet doanh thu</h3>
        </div>
        {buckets.length === 0 ? (
          <p className="text-sm text-ink-400 py-8 text-center">Chua co du lieu don hang</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Ky bao cao</th>
                  <th className="text-right px-5 py-3 font-semibold">So don</th>
                  <th className="text-right px-5 py-3 font-semibold">Doanh thu</th>
                  <th className="text-right px-5 py-3 font-semibold">Gia tri TB/don</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {buckets.slice().reverse().map((b) => (
                  <tr key={b.key} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-ink-800">{b.label}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-700">{b.orders}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-ink-900">{formatCurrency(b.revenue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-600">{formatCurrency(b.avgOrder)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-ink-50/80 border-t-2 border-ink-200">
                <tr>
                  <td className="px-5 py-3 font-bold text-ink-900">Tong cong</td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold text-ink-900">{totalOrders}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold text-ink-900">{formatCurrency(totalRevenue)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-bold text-ink-900">{formatCurrency(avgOrderValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <h3 className="text-base font-semibold text-ink-900">Don hang gan day</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Ma don</th>
                  <th className="text-left px-5 py-3 font-semibold">Khach hang</th>
                  <th className="text-left px-5 py-3 font-semibold">Ngay</th>
                  <th className="text-right px-5 py-3 font-semibold">Tong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-ink-900">{o.order_number}</td>
                    <td className="px-5 py-3 text-ink-600">{o.customer?.name ?? 'Khach le'}</td>
                    <td className="px-5 py-3 text-ink-500">{formatDate(o.placed_at)}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-900">{formatCurrency(Number(o.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
