import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Boxes,
  Sparkles,
  Warehouse,
  ArrowLeftRight,
  FlaskConical,
  ScrollText,
  ClipboardList,
  Layers,
  Truck,
  Receipt,
  ShieldCheck,
  Bot,
  Webhook,
  Zap,
  Activity,
  PackageCheck,
  BadgePercent,
  Banknote,
  Link2,
  RefreshCw,
  Gauge,
  TrendingUp,
  ShieldAlert,
  Settings,
  LogOut,
  CircuitBoard,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth, useRole } from '@/providers/AuthProvider';
import type { UserRole } from '@/types';

export type PageId =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'products'
  | 'inventory'
  | 'warehouses'
  | 'transfers'
  | 'batches'
  | 'stockLedger'
  | 'purchaseOrders'
  | 'channelMapping'
  | 'channelConnections'
  | 'syncMonitor'
  | 'fulfillment'
  | 'returns'
  | 'complaints'
  | 'ledger'
  | 'feeReconciliation'
  | 'marginControl'
  | 'salesVelocity'
  | 'revenueReport'
  | 'auditTrail'
  | 'automationRules'
  | 'webhooks'
  | 'simulator'
  | 'bufferRules'
  | 'routingRules'
  | 'settings'
  | 'flowGuide';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Tong quan',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'flowGuide', label: 'Luong hoat dong', icon: CircuitBoard },
    ],
  },
  {
    label: 'Ban hang',
    items: [
      { id: 'orders', label: 'Don hang', icon: ShoppingCart },
      { id: 'customers', label: 'Khach hang', icon: Users },
      { id: 'complaints', label: 'Khieu nai & AI', icon: Bot },
      { id: 'returns', label: 'Doi tra / RMA', icon: PackageCheck },
    ],
  },
  {
    label: 'Danh muc & Ton kho',
    items: [
      { id: 'products', label: 'San pham & BOM', icon: Package, roles: ['admin', 'manager'] },
      { id: 'inventory', label: 'Ton kho 5 trang thai', icon: Boxes },
      { id: 'warehouses', label: 'Kho & Bin', icon: Warehouse, roles: ['admin', 'manager'] },
      { id: 'transfers', label: 'Chuyen kho', icon: ArrowLeftRight },
      { id: 'batches', label: 'Lo & Serial', icon: FlaskConical },
      { id: 'stockLedger', label: 'So giao dich ton', icon: ScrollText },
      { id: 'purchaseOrders', label: 'Don mua hang', icon: ClipboardList, roles: ['admin', 'manager'] },
      { id: 'channelMapping', label: 'Anh xa SKU kenh', icon: Layers, roles: ['admin', 'manager'] },
      { id: 'channelConnections', label: 'Ket noi kenh', icon: Link2, roles: ['admin', 'manager'] },
      { id: 'syncMonitor', label: 'Giam sat dong bo', icon: RefreshCw, roles: ['admin', 'manager'] },
      { id: 'bufferRules', label: 'Ton kho an toan', icon: ShieldAlert, roles: ['admin', 'manager'] },
      { id: 'routingRules', label: 'Dinh tuyen kho', icon: Activity, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Giao hang',
    items: [
      { id: 'fulfillment', label: 'Wave Picking & SLA', icon: Truck },
    ],
  },
  {
    label: 'Tai chinh',
    items: [
      { id: 'ledger', label: 'So kep', icon: Banknote, roles: ['admin', 'manager'] },
      { id: 'feeReconciliation', label: 'Doi soát phi', icon: Receipt, roles: ['admin', 'manager'] },
      { id: 'marginControl', label: 'Marg Circuit Breaker', icon: BadgePercent, roles: ['admin', 'manager'] },
      { id: 'salesVelocity', label: 'Van toc ban', icon: Gauge, roles: ['admin', 'manager'] },
      { id: 'revenueReport', label: 'Bao cao doanh thu', icon: TrendingUp, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Quan tri & Nen tang',
    items: [
      { id: 'auditTrail', label: 'Nhat ky Audit', icon: ShieldCheck, roles: ['admin'] },
      { id: 'automationRules', label: 'Luat tu dong', icon: Zap, roles: ['admin', 'manager'] },
      { id: 'webhooks', label: 'Outbound Webhooks', icon: Webhook, roles: ['admin'] },
      { id: 'simulator', label: 'Chaos Simulator', icon: Activity, roles: ['admin'] },
      { id: 'settings', label: 'Cai dat & Phan quyen', icon: Settings, roles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  stats: { pendingOrders: number; lowStock: number };
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quan tri vien',
  manager: 'Quan ly',
  warehouse: 'Nhan vien kho',
};

export function Sidebar({ current, onNavigate, stats, mobileOpen, onMobileClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { role } = useRole();

  const userRole = profile?.role ?? 'warehouse';
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'w-64 shrink-0 bg-ink-950 text-ink-100 flex flex-col h-screen overflow-y-auto overflow-x-hidden fixed lg:sticky top-0 z-50 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />

      <div className="relative px-5 py-5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Boxes size={22} className="text-white" />
            <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">NexusOMS</h1>
            <p className="text-[11px] text-ink-400 font-medium flex items-center gap-1">
              <Sparkles size={9} className="text-brand-400" />
              Enterprise v3.0
            </p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 px-3 py-3 space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = current === item.id;
                const Icon = item.icon;
                const badge =
                  item.id === 'orders'
                    ? stats.pendingOrders
                    : item.id === 'inventory' || item.id === 'products'
                      ? stats.lowStock
                      : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); onMobileClose(); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                      active
                        ? 'bg-brand-600/15 text-brand-200 border border-brand-600/20'
                        : 'text-ink-300 hover:bg-white/5 hover:text-white border border-transparent'
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-brand-400" />
                    )}
                    <Icon
                      size={17}
                      className={cn(
                        'transition-transform duration-200 group-hover:scale-110 shrink-0',
                        active ? 'text-brand-300' : ''
                      )}
                    />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          'text-[10px] font-semibold rounded-full px-1.5 py-0.5 transition-all shrink-0',
                          active
                            ? 'bg-brand-500 text-white'
                            : 'bg-white/10 text-ink-200 group-hover:bg-white/15'
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative px-4 py-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-1 mb-3">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-900/30">
            {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-ink-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-[11px] text-ink-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {ROLE_LABELS[userRole]}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            title="Dang xuat"
            className="p-2 rounded-lg text-ink-400 hover:text-rose-400 hover:bg-white/5 transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
