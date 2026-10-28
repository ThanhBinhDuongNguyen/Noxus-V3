import { useEffect, useMemo, useState } from 'react';
import { Gauge, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';
import type { Order, Product } from '@/types';

export function SalesVelocityPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 30 | 90>(7);

  useEffect(() => {
    async function load() {
      const days = range;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [oRes, pRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').gte('placed_at', since).order('placed_at', { ascending: false }),
        supabase.from('products').select('*'),
      ]);
      setOrders((oRes.data as Order[]) ?? []);
      setProducts((pRes.data as Product[]) ?? []);
      setLoading(false);
    }
    load();
  }, [range]);

  const stats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
    const revenue = validOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalItems = validOrders.reduce((s, o) => s + (o.order_items?.reduce((q, i) => q + i.quantity, 0) ?? 0), 0);

    const productSales: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {};
    validOrders.forEach((o) => {
      o.order_items?.forEach((i) => {
        if (!productSales[i.product_id]) {
          productSales[i.product_id] = { name: i.product_name, sku: i.product_sku, qty: 0, revenue: 0 };
        }
        productSales[i.product_id].qty += i.quantity;
        productSales[i.product_id].revenue += Number(i.line_total);
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10);

    const velocityPerHour = revenue / (range * 24);

    const dailyData: { label: string; value: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const dayTotal = validOrders
        .filter((o) => { const d = new Date(o.placed_at); return d >= day && d < next; })
        .reduce((s, o) => s + Number(o.total), 0);
      dailyData.push({ label: day.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }), value: dayTotal });
    }

    return { revenue, totalOrders: validOrders.length, totalItems, topProducts, velocityPerHour, dailyData };
  }, [orders, range]);

  const maxBar = Math.max(...stats.dailyData.map((d) => d.value), 1);

  if (loading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Bao cao van toc ban</h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((r) => (
            <button key={r} onClick={() => setRange(r as 7 | 30 | 90)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                range === r ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50')}>
              {r} ngay
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp size={20} className="text-emerald-600" /></div>
            <p className="text-sm text-ink-400">Doanh thu ({range} ngay)</p>
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">{formatCurrency(stats.revenue)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center"><Gauge size={20} className="text-brand-600" /></div>
            <p className="text-sm text-ink-400">Van toc ban / gio</p>
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">{formatCurrency(stats.velocityPerHour)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Package size={20} className="text-amber-600" /></div>
            <p className="text-sm text-ink-400">San pham da ban</p>
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">{stats.totalItems}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink-900 mb-5">Doanh thu theo ngay</h3>
        <div className="flex items-end justify-between gap-1 h-48">
          {stats.dailyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex-1 flex items-end">
                <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-500 group-hover:from-brand-700 group-hover:to-brand-500"
                  style={{ height: `${Math.max((d.value / maxBar) * 100, 3)}%` }} />
              </div>
              <span className="text-[10px] text-ink-400 font-medium">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink-900 mb-4">Top san pham ban chay</h3>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-ink-400 py-6 text-center">Chua co du lieu ban hang trong ky nay</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left pb-3 font-semibold">#</th>
                <th className="text-left pb-3 font-semibold">San pham</th>
                <th className="text-left pb-3 font-semibold">SKU</th>
                <th className="text-right pb-3 font-semibold">So luong</th>
                <th className="text-right pb-3 font-semibold">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {stats.topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-ink-50/50">
                  <td className="py-3 text-ink-400 font-semibold">{i + 1}</td>
                  <td className="py-3 font-medium text-ink-800">{p.name}</td>
                  <td className="py-3 text-ink-500 text-xs">{p.sku}</td>
                  <td className="py-3 text-right tabular-nums font-semibold text-ink-700">{p.qty}</td>
                  <td className="py-3 text-right tabular-nums font-bold text-ink-900">{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
