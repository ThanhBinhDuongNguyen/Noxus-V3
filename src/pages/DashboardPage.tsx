import { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { Order } from '@/types';

interface DashboardMetrics {
  revenue: number;
  prevRevenue: number;
  revenueChange: number;
  totalOrders: number;
  recentOrdersCount: number;
  pendingOrders: number;
  activeCustomers: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  statusCounts: Record<string, number>;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  reorder_level: number;
}

interface DailyRevenue {
  day: string;
  revenue: number;
  order_count: number;
}

export function DashboardPage({ onNavigate }: { onNavigate?: (page: 'orders') => void }) {
  const { activeTenant } = useAuth();
  const tenantId = activeTenant?.id ?? '';
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    async function load() {
      try {
        const [metricsRes, dailyRes, lowStockRes, recentRes] = await Promise.all([
          supabase.rpc('get_dashboard_metrics', { p_tenant_id: tenantId }),
          supabase.rpc('get_dashboard_daily', { p_tenant_id: tenantId }),
          supabase.rpc('get_low_stock_products', { p_tenant_id: tenantId }),
          supabase
            .from('orders')
            .select('*, customer:customers(*)')
            .order('placed_at', { ascending: false })
            .limit(8),
        ]);

        if (metricsRes.error) throw metricsRes.error;
        if (dailyRes.error) throw dailyRes.error;
        if (lowStockRes.error) throw lowStockRes.error;
        if (recentRes.error) throw recentRes.error;

        const m = metricsRes.data as Record<string, number | string>;
        const revenue = Number(m.revenue ?? 0);
        const prevRevenue = Number(m.prev_revenue ?? 0);
        const revenueChange =
          prevRevenue > 0
            ? ((revenue - prevRevenue) / prevRevenue) * 100
            : revenue > 0 ? 100 : 0;

        setMetrics({
          revenue,
          prevRevenue,
          revenueChange,
          totalOrders: Number(m.total_orders ?? 0),
          recentOrdersCount: Number(m.recent_orders_count ?? 0),
          pendingOrders: Number(m.pending_orders ?? 0),
          activeCustomers: Number(m.active_customers ?? 0),
          totalCustomers: Number(m.total_customers ?? 0),
          totalProducts: Number(m.total_products ?? 0),
          lowStockCount: Number(m.low_stock_count ?? 0),
          statusCounts: (m.status_counts as Record<string, number>) ?? {},
        });

        setDailyData((dailyRes.data as DailyRevenue[]) ?? []);
        setLowStock((lowStockRes.data as LowStockProduct[]) ?? []);
        setRecentOrders((recentRes.data as Order[]) ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Loi tai du lieu dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  if (loading) return <FullPageSpinner label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertTriangle size={24} className="text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-800">Khong tai duoc du lieu dashboard</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            Thu lai
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return <FullPageSpinner label="Loading dashboard..." />;

  // Build 7-day chart data, filling missing days with 0
  const chartData: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const dayStr = day.toISOString().split('T')[0];
    const matched = dailyData.find((d) => d.day === dayStr);
    chartData.push({
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      value: matched ? Number(matched.revenue) : 0,
    });
  }
  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  const statusBreakdown = Object.entries(metrics.statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl gradient-brand p-6 lg:p-8 text-white">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-white/80" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Welcome back</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Tong quan hoat dong</h2>
            <p className="text-sm text-white/70 mt-1.5">
              {metrics.pendingOrders} don cho xu ly · {metrics.lowStockCount} canh bao ton kho
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60 uppercase tracking-wider font-medium">Doanh thu (30 ngay)</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{formatCurrency(metrics.revenue)}</p>
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <span className={cn('flex items-center gap-0.5 text-xs font-semibold', metrics.revenueChange >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                {metrics.revenueChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {Math.abs(metrics.revenueChange).toFixed(1)}%
              </span>
              <span className="text-xs text-white/60">vs 30 ngay truoc</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Doanh thu (30 ngay)" value={formatCurrency(metrics.revenue)} change={metrics.revenueChange} icon={DollarSign} iconBg="bg-emerald-50 text-emerald-600" accentColor="from-emerald-400 to-emerald-600" />
        <KpiCard label="Tong don hang" value={metrics.totalOrders.toString()} sublabel={`${metrics.recentOrdersCount} trong 30 ngay`} icon={ShoppingCart} iconBg="bg-brand-50 text-[var(--brand-600)]" accentColor="from-brand-400 to-brand-600" />
        <KpiCard label="Khach hoat dong" value={metrics.activeCustomers.toString()} sublabel={`${metrics.totalCustomers} tong`} icon={Users} iconBg="bg-sky-50 text-sky-600" accentColor="from-sky-400 to-sky-600" />
        <KpiCard label="San pham trong danh muc" value={metrics.totalProducts.toString()} sublabel={`${metrics.lowStockCount} sap het hang`} icon={Package} iconBg="bg-amber-50 text-amber-600" accentColor="from-amber-400 to-amber-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-ink-900">Doanh thu — 7 ngay gan nhat</h3>
              <p className="text-sm text-ink-400 mt-0.5">Tong don hang theo ngay (khong tinh don huy)</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <TrendingUp size={16} />
              {formatCurrency(chartData.reduce((s, d) => s + d.value, 0))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {chartData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex-1 flex items-end relative">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-500 hover:from-brand-700 hover:to-brand-500 group-hover:shadow-lg group-hover:shadow-brand-200/60 animate-bar-grow" style={{ height: `${Math.max((day.value / maxChartValue) * 100, 4)}%`, animationDelay: `${i * 80}ms` }} />
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-xs font-medium px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">{formatCurrency(day.value)}</div>
                </div>
                <span className="text-xs text-ink-400 font-medium">{day.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <h3 className="text-base font-semibold text-ink-900 mb-1">Trang thai don hang</h3>
          <p className="text-sm text-ink-400 mb-5">Phan bo theo tat ca don hang</p>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-ink-400 py-8 text-center">Chua co don hang</p>
          ) : (
            <div className="space-y-3.5">
              {statusBreakdown.map(({ status, count }) => {
                const pct = metrics.totalOrders > 0 ? (count / metrics.totalOrders) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-ink-700 capitalize">{ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}</span>
                      <span className="text-ink-400 tabular-nums">{count}</span>
                    </div>
                    <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700 ease-out', ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS]?.split(' ')[0] ?? 'bg-ink-300')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-ink-900">Don hang gan day</h3>
            <button onClick={() => onNavigate?.('orders')} className="text-xs font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)] flex items-center gap-1 transition-colors">
              Xem tat ca <ArrowUpRight size={13} />
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-ink-400 py-8 text-center">Chua co don hang nao</p>
          ) : (
            <div className="space-y-1">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-ink-50 transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                    <ShoppingCart size={18} className="text-[var(--brand-600)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800">{order.order_number}</p>
                    <p className="text-xs text-ink-400 truncate">{order.customer?.name ?? 'Khach le'} · {formatDate(order.placed_at)}</p>
                  </div>
                  <span className={cn('badge', ORDER_STATUS_COLORS[order.status])}>{ORDER_STATUS_LABELS[order.status]}</span>
                  <span className="text-sm font-bold text-ink-900 tabular-nums w-20 text-right">{formatCurrency(Number(order.total))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <h3 className="text-base font-semibold text-ink-900 mb-4">Canh bao ton kho</h3>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <TrendingUp size={26} className="text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-ink-700">Ton kho deu on dinh</p>
              <p className="text-xs text-ink-400 mt-1">Khong co san pham duoi muc dat lai</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.pendingOrders > 0 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/60">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-900">{metrics.pendingOrders} don cho xu ly</p>
                    <p className="text-xs text-amber-700">Dang cho xu ly</p>
                  </div>
                </div>
              )}
              {lowStock.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200/60">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-rose-900 truncate">{product.name}</p>
                    <p className="text-xs text-rose-700">{product.stock} left · reorder at {product.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, sublabel, change, icon: Icon, iconBg, accentColor,
}: {
  label: string; value: string; sublabel?: string; change?: number;
  icon: typeof DollarSign; iconBg: string; accentColor: string;
}) {
  return (
    <Card className="p-5 hover:shadow-lg hover:shadow-ink-200/40 transition-all duration-300 group relative overflow-hidden">
      <div className={cn('absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br opacity-5 blur-2xl transition-opacity duration-300 group-hover:opacity-10', accentColor)} />
      <div className="flex items-start justify-between relative">
        <div className="flex-1">
          <p className="text-sm text-ink-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-ink-900 mt-2 tabular-nums">{value}</p>
          {sublabel && <p className="text-xs text-ink-400 mt-1">{sublabel}</p>}
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={cn('flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md', change >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50')}>
                {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-xs text-ink-400">vs 30 ngay truoc</span>
            </div>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110', iconBg)}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
