import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime, truncateHash } from '@/lib/utils';
import type { AuditLog } from '@/types';

interface AuditTrailPageProps {
  search: string;
}

export function AuditTrailPage({ search }: AuditTrailPageProps) {
  const { activeTenant } = useAuth();
  const tenantId = activeTenant?.id ?? '';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<{ is_valid: boolean; total_entries: number; broken_at_id?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    setLogs((data as AuditLog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function verifyChain() {
    if (!tenantId) return;
    setVerifying(true);
    const { data, error } = await supabase.rpc('verify_audit_chain', { p_tenant_id: tenantId });
    setVerifying(false);
    if (error) return;
    setVerification(data as { is_valid: boolean; total_entries: number; broken_at_id?: string });
  }

  const filtered = logs.filter((l) =>
    !search || l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_ref ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (l.actor_id ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <ShieldCheck size={24} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Tamper-Evident Audit Trail</h2>
            <p className="text-sm text-ink-500">SHA-256 Hash Chain — any DB tampering is instantly detectable</p>
          </div>
        </div>
        <button onClick={verifyChain} disabled={verifying} className="btn-primary">
          {verifying ? <Spinner size={16} /> : <ShieldCheck size={16} />} Verify Chain
        </button>
      </div>

      {verification && (
        <div className={`card p-5 flex items-center gap-4 ${verification.is_valid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          {verification.is_valid ? (
            <>
              <CheckCircle2 size={28} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">Chain Integrity: VALID</p>
                <p className="text-sm text-emerald-700">{verification.total_entries} entries verified — no tampering detected</p>
              </div>
            </>
          ) : (
            <>
              <XCircle size={28} className="text-rose-600 shrink-0" />
              <div>
                <p className="font-semibold text-rose-800">Chain Integrity: BROKEN</p>
                <p className="text-sm text-rose-700">
                  Tampering detected at entry ID: {truncateHash(verification.broken_at_id ?? '', 8)}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No audit logs" description="Sensitive actions will be recorded here" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Actor</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Entity</th>
                <th className="text-left px-4 py-3 font-semibold">Prev Hash</th>
                <th className="text-left px-4 py-3 font-semibold">Current Hash</th>
                <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 text-ink-700 font-medium">{l.actor_id}</td>
                  <td className="px-4 py-3 text-ink-600">{l.action}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{l.entity_ref ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-400 text-xs font-mono">{truncateHash(l.prev_hash ?? 'GENESIS', 10)}</td>
                  <td className="px-4 py-3 text-ink-600 text-xs font-mono">{truncateHash(l.current_hash, 10)}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{formatDateTime(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
