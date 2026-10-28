import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole, Tenant, TenantMembership, TenantRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  memberships: TenantMembership[];
  activeTenant: Tenant | null;
  activeRole: TenantRole | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACTIVE_TENANT_KEY = 'nexus_active_tenant';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, []);

  const loadMemberships = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('*, tenant:tenants(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      setMemberships([]);
      setActiveTenant(null);
      return;
    }

    const mships = data as unknown as TenantMembership[];
    setMemberships(mships);

    // Restore active tenant from localStorage or default to first
    const savedTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
    const saved = savedTenantId
      ? mships.find((m) => m.tenant_id === savedTenantId)
      : null;
    const target = saved ?? mships[0];
    setActiveTenant(target?.tenant ?? null);
    if (target?.tenant_id) {
      localStorage.setItem(ACTIVE_TENANT_KEY, target.tenant_id);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        Promise.all([
          loadProfile(data.session.user.id),
          loadMemberships(data.session.user.id),
        ]);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        (async () => {
          await Promise.all([
            loadProfile(sess.user.id),
            loadMemberships(sess.user.id),
          ]);
        })();
      } else {
        setProfile(null);
        setMemberships([]);
        setActiveTenant(null);
        localStorage.removeItem(ACTIVE_TENANT_KEY);
        setLoading(false);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, [loadProfile, loadMemberships]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
    setActiveTenant(null);
    setSession(null);
    localStorage.removeItem(ACTIVE_TENANT_KEY);
  }

  function switchTenant(tenantId: string) {
    const m = memberships.find((m) => m.tenant_id === tenantId);
    if (m?.tenant) {
      setActiveTenant(m.tenant);
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    }
  }

  const activeRole = memberships.find((m) => m.tenant_id === activeTenant?.id)?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        memberships,
        activeTenant,
        activeRole,
        signIn,
        signOut,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRole(): {
  role: UserRole | null;
  tenantRole: TenantRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isWarehouse: boolean;
  canDelete: boolean;
  canManageFinance: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
} {
  const { profile, activeRole } = useAuth();
  const role = profile?.role ?? null;
  const tenantRole = activeRole;
  const isAdmin = tenantRole === 'owner' || tenantRole === 'admin';
  const isManager = tenantRole === 'manager' || isAdmin;
  const isWarehouse = tenantRole === 'warehouse';
  return {
    role,
    tenantRole,
    isAdmin,
    isManager,
    isWarehouse,
    canDelete: tenantRole === 'owner',
    canManageFinance: isManager,
    canManageSettings: isAdmin,
    canManageUsers: isAdmin,
  };
}
