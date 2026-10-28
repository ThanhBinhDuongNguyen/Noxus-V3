import { useEffect, useState } from 'react';
import { Webhook, Plus, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';
import type { OutboundWebhook, WebhookDeliveryLog } from '@/types';

interface WebhooksPageProps {
  search: string;
}

export function WebhooksPage({ search }: WebhooksPageProps) {
  const toast = useToast();
  const [webhooks, setWebhooks] = useState<OutboundWebhook[]>([]);
  const [logs, setLogs] = useState<(WebhookDeliveryLog & { webhook?: OutboundWebhook })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [wRes, lRes] = await Promise.all([
      supabase.from('outbound_webhooks').select('*').order('created_at', { ascending: false }),
      supabase.from('webhook_delivery_logs').select('*, webhook:outbound_webhooks(*)').order('delivered_at', { ascending: false }).limit(50),
    ]);
    setWebhooks((wRes.data as OutboundWebhook[]) ?? []);
    setLogs((lRes.data as (WebhookDeliveryLog & { webhook?: OutboundWebhook })[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = webhooks.filter((w) =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.target_url ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(w: OutboundWebhook) {
    const { error } = await supabase.from('outbound_webhooks').update({ is_active: !w.is_active }).eq('id', w.id);
    if (error) { toast('Failed', 'error'); return; }
    toast(`Webhook ${!w.is_active ? 'activated' : 'deactivated'}`, 'success');
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('outbound_webhooks').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) { toast('Failed', 'error'); return; }
    toast('Webhook deleted', 'success');
    load();
  }

  async function resend(log: WebhookDeliveryLog) {
    const webhook = webhooks.find((w) => w.id === log.webhook_id);
    if (!webhook) { toast('Webhook config not found', 'error'); return; }
    setRetryingId(log.id);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(webhook.target_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: log.event_type, data: log.payload ?? {} }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const { error } = await supabase.from('webhook_delivery_logs').insert({
        webhook_id: webhook.id,
        event_type: log.event_type,
        payload: log.payload,
        status_code: res.status,
        response_body: await res.text().catch(() => null),
        attempt_number: (log.attempt_number ?? 0) + 1,
        delivered_at: new Date().toISOString(),
      });
      if (error) { toast('Retry sent but log failed', 'error'); return; }
      toast(`Retry sent — HTTP ${res.status}`, res.ok ? 'success' : 'error');
      load();
    } catch {
      const { error } = await supabase.from('webhook_delivery_logs').insert({
        webhook_id: webhook.id,
        event_type: log.event_type,
        payload: log.payload,
        status_code: null,
        response_body: 'Request failed or timed out',
        attempt_number: (log.attempt_number ?? 0) + 1,
        delivered_at: new Date().toISOString(),
      });
      if (error) { toast('Retry failed', 'error'); return; }
      toast('Retry failed — target unreachable', 'error');
      load();
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Outbound Webhooks ({filtered.length})</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Webhook</button>
      </div>

      {/* Webhook configs */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Webhook} title="No webhooks" description="Create outbound webhooks to notify external systems" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((w) => (
            <div key={w.id} className={`card p-5 ${!w.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${w.is_active ? 'bg-blue-100' : 'bg-ink-100'}`}>
                    <Webhook size={18} className={w.is_active ? 'text-blue-600' : 'text-ink-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink-800">{w.name}</h3>
                    <a href={w.target_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                      <ExternalLink size={10} /> {w.target_url}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(w)} className={`btn-ghost px-3 py-1.5 text-xs ${w.is_active ? 'text-emerald-600' : 'text-ink-400'}`}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => setDeleteId(w.id)} className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {w.event_types?.map((ev: string) => (
                  <span key={ev} className="badge bg-slate-100 text-slate-600 border-slate-200 text-xs">{ev}</span>
                )) ?? <span className="text-xs text-ink-400">No events subscribed</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delivery logs */}
      <div>
        <h3 className="text-sm font-semibold text-ink-700 mb-3">Recent Delivery Logs</h3>
        {logs.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-ink-400">No delivery logs yet. Logs appear when events fire.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Webhook</th>
                  <th className="text-left px-4 py-3 font-semibold">Event</th>
                  <th className="text-center px-4 py-3 font-semibold">HTTP</th>
                  <th className="text-center px-4 py-3 font-semibold">Attempts</th>
                  <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {logs.map((l) => {
                  const success = l.status_code !== null && l.status_code >= 200 && l.status_code < 300;
                  return (
                    <tr key={l.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3 text-ink-700">{l.webhook?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-600 text-xs">{l.event_type}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${success ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                          {l.status_code ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-ink-600 tabular-nums">{l.attempt_number}</td>
                      <td className="px-4 py-3 text-ink-500 text-xs">{formatDateTime(l.delivered_at)}</td>
                      <td className="px-4 py-3">
                        {!success && (
                          <button onClick={() => resend(l)} disabled={retryingId === l.id} className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50">
                            {retryingId === l.id ? <Spinner size={12} /> : <RefreshCw size={12} />} Retry
                          </button>
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

      {showModal && <NewWebhookModal open={showModal} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false); }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Webhook?" message="This webhook configuration will be permanently deleted." confirmLabel="Delete" />
    </div>
  );

  function NewWebhookModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [events, setEvents] = useState('order.created,order.shipped,order.delivered');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      if (!name || !url) { toast('Fill name and URL', 'error'); return; }
      setSaving(true);
      const { error } = await supabase.from('outbound_webhooks').insert({
        name, target_url: url,
        event_types: events.split(',').map((e) => e.trim()).filter(Boolean),
        is_active: true,
      });
      setSaving(false);
      if (error) { toast('Failed: ' + error.message, 'error'); return; }
      toast('Webhook created', 'success');
      onSaved();
    }

    return (
      <Modal open={open} onClose={onClose} title="New Outbound Webhook" size="md"
        footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Create</button></>}>
        <div className="space-y-4">
          <div><label className="label">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. ERP Sync" /></div>
          <div><label className="label">URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} className="input" placeholder="https://..." /></div>
          <div><label className="label">Events (comma-separated)</label><input value={events} onChange={(e) => setEvents(e.target.value)} className="input" /></div>
        </div>
      </Modal>
    );
  }
}
