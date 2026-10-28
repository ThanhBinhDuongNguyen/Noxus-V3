import { useEffect, useState } from 'react';
import { Link2, Plus, Trash2, Plug, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';
import type { ChannelConnection, Channel } from '@/types';

interface ChannelConnectionsPageProps {
  search: string;
}

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'shopee', label: 'Shopee' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'website', label: 'Website' },
];

export function ChannelConnectionsPage({ search }: ChannelConnectionsPageProps) {
  const toast = useToast();
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('channel_connections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast('Loi tai danh sach: ' + error.message, 'error');
      setConnections([]);
    } else {
      setConnections(data as ChannelConnection[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = connections.filter((c) =>
    !search || c.shop_name.toLowerCase().includes(search.toLowerCase()) ||
    c.channel.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleStatus(c: ChannelConnection) {
    const newStatus = c.status === 'connected' ? 'disconnected' : 'connected';
    const { error } = await supabase
      .from('channel_connections')
      .update({ status: newStatus })
      .eq('id', c.id);
    if (error) { toast('Cap nhat that bai', 'error'); return; }
    toast(`Ket noi da ${newStatus === 'connected' ? 'bat' : 'tat'}`, 'success');
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('channel_connections').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) { toast('Xoa that bai', 'error'); return; }
    toast('Da xoa ket noi', 'success');
    load();
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner size={28} /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-ink-900">Ket noi kenh ban ({filtered.length})</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0"><Plus size={16} /> Them ket noi</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Link2} title="Chua co ket noi" description="Them ket noi shop Shopee, TikTok, Lazada hoac Website" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const isConnected = c.status === 'connected';
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      {isConnected ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-rose-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-800">{c.shop_name}</h3>
                      <p className="text-xs text-ink-400 uppercase">{c.channel}</p>
                    </div>
                  </div>
                  <button onClick={() => setDeleteId(c.id)} className="text-ink-400 hover:text-rose-500 p-1.5">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-ink-400">Shop ID</span><span className="text-ink-700 font-medium">{c.shop_id}</span></div>
                  <div className="flex justify-between"><span className="text-ink-400">Trang thai</span>
                    <span className={`badge ${isConnected ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                      {isConnected ? 'Da ket noi' : 'Ngat'}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-ink-400">Dong bo cuoi</span><span className="text-ink-600 text-xs">{formatDateTime(c.last_sync_at)}</span></div>
                </div>
                <button onClick={() => toggleStatus(c)} className={`btn-ghost w-full mt-4 justify-center text-sm ${isConnected ? 'text-rose-600' : 'text-emerald-600'}`}>
                  <Plug size={14} /> {isConnected ? 'Ngat ket noi' : 'Ket noi lai'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <NewConnectionModal open={showModal} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false); }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Xoa ket noi?" message="Ket noi nay se bi xoa vinh vien." confirmLabel="Xoa" />
    </div>
  );

  function NewConnectionModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
    const [channel, setChannel] = useState<Channel>('shopee');
    const [shopName, setShopName] = useState('');
    const [shopId, setShopId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      if (!shopName || !shopId) { toast('Nhap ten shop va shop ID', 'error'); return; }
      setSaving(true);
      const { error } = await supabase.from('channel_connections').insert({
        channel, shop_name: shopName, shop_id: shopId,
        api_key_masked: apiKey ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4) : null,
        status: 'connected', last_sync_at: new Date().toISOString(),
      });
      setSaving(false);
      if (error) { toast('Loi: ' + error.message, 'error'); return; }
      toast('Da them ket noi', 'success');
      onSaved();
    }

    return (
      <Modal open={open} onClose={onClose} title="Them ket noi kenh" size="md"
        footer={<><button onClick={onClose} className="btn-secondary">Huy</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Them</button></>}>
        <div className="space-y-4">
          <div><label className="label">Kenh</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className="input">
              {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div><label className="label">Ten shop *</label><input value={shopName} onChange={(e) => setShopName(e.target.value)} className="input" placeholder="VD: Nexus Official Store" /></div>
          <div><label className="label">Shop ID *</label><input value={shopId} onChange={(e) => setShopId(e.target.value)} className="input" placeholder="VD: 123456789" /></div>
          <div><label className="label">API Key</label><input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="input" placeholder="API key cua kenh" /></div>
        </div>
      </Modal>
    );
  }
}
