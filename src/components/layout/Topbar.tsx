import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Plus, Menu, ChevronDown, Building2, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';

interface TopbarProps {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  onMobileMenu?: () => void;
}

export function Topbar({
  title,
  subtitle,
  search,
  onSearch,
  searchPlaceholder = 'Tim kiem...',
  onPrimaryAction,
  primaryActionLabel = 'Them moi',
  onMobileMenu,
}: TopbarProps) {
  const { activeTenant, memberships, switchTenant } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass border-b border-ink-200/60">
      <div className="px-4 lg:px-8 py-4 flex items-center gap-3">
        {onMobileMenu && (
          <button
            onClick={onMobileMenu}
            className="lg:hidden p-2 rounded-lg text-ink-600 hover:bg-ink-100 transition-all shrink-0"
          >
            <Menu size={22} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-lg lg:text-xl font-bold text-ink-900 tracking-tight truncate">
            {title}
          </h2>
          <p className="text-xs lg:text-sm text-ink-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>
        </div>

        {/* Tenant switcher */}
        {memberships.length > 0 && (
          <div className="relative shrink-0" ref={switcherRef}>
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 bg-white/60 hover:bg-white transition-all duration-200"
            >
              <Building2 size={16} className="text-[var(--brand-600)]" />
              <span className="text-sm font-medium text-ink-800 hidden sm:inline truncate max-w-32">
                {activeTenant?.name ?? 'Chon workspace'}
              </span>
              <ChevronDown size={14} className={cn('text-ink-400 transition-transform', showSwitcher && 'rotate-180')} />
            </button>

            {showSwitcher && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-ink-200 shadow-lg overflow-hidden animate-scale-in z-50">
                <div className="px-3 py-2 border-b border-ink-100">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Workspace</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {memberships.map((m) => (
                    <button
                      key={m.tenant_id}
                      onClick={() => {
                        switchTenant(m.tenant_id);
                        setShowSwitcher(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-ink-50 transition-colors',
                        activeTenant?.id === m.tenant_id && 'bg-brand-50'
                      )}
                    >
                      <Building2 size={15} className="text-ink-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-800 truncate">
                          {m.tenant?.name ?? '—'}
                        </p>
                        <p className="text-xs text-ink-400 capitalize">{m.role}</p>
                      </div>
                      {activeTenant?.id === m.tenant_id && (
                        <Check size={15} className="text-[var(--brand-600)] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative hidden md:block group shrink-0">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 group-focus-within:text-[var(--brand-500)] transition-colors"
          />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-48 lg:w-72 rounded-xl border border-ink-200 bg-white/60 pl-9 pr-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 focus:bg-white transition-all duration-200"
          />
        </div>

        <button className="relative p-2 rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-700 transition-all duration-200 hover:scale-105 shrink-0">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
        </button>

        {onPrimaryAction && (
          <button
            onClick={onPrimaryAction}
            className="btn-primary group shrink-0"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
            <span className="hidden sm:inline">{primaryActionLabel}</span>
          </button>
        )}

        {/* Mobile search */}
        <div className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-ink-200 px-4 py-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
