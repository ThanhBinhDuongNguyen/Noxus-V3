import { useEffect, useState } from 'react';
import { PackageCheck, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
} from '@/lib/utils';
import type { ReturnRequest, Order } from '@/types';

interface ReturnsPageProps {
  search: string;
}

export function ReturnsPage({ search }: ReturnsPageProps) {
  const toast = useToast();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('return_requests')
      .select('*, order:orders(*)')
      .order('created_at', { ascending: false });
    setReturns((data as ReturnRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('placed_at', { ascending: false })
      .limit(100);
    setOrders((data as Order[]) ?? []);
  }

  const filtered = returns.filter((r) =>
    !search ||
    r.return_number.toLowerCase().includes(search.toLowerCase()) ||
    r.order?.order_number?.toLowerCase().includes(search.toLowerCase())
  );

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('return_requests').update({ status }).eq('id', id);
    if (error) { toast('Failed to update', 'error'); return; }
    toast('Return status updated', 'success');
    load();
  }

  async function approve(id: string, level: 'maker' | 'checker') {
    const status = level === 'maker' ? 'maker_approved' : 'checker_approved';
    const { error } = await supabase.from('return_requests').update({ approval_status: status }).eq('id', id);
    if (error) { toast('Approval failed', 'error'); return; }
    toast(`${level === 'maker' ? 'Maker' : 'Checker'} approved`, 'success');
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Return Requests ({filtered.length})</h2>
        <button onClick={() => { loadOrders(); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> New Return
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={PackageCheck} title="No return requests" description="Create a return request to get started" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">RMA #</th>
                <th className="text-left px-4 py-3 font-semibold">Order</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Approval</th>
                <th className="text-right px-4 py-3 font-semibold">Refund</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 font-medium text-ink-800">{r.return_number}</td>
                  <td className="px-4 py-3 text-ink-600">{r.order?.order_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-ink-600 capitalize">{r.return_type.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${RETURN_STATUS_COLORS[r.status]}`}>{RETURN_STATUS_LABELS[r.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${APPROVAL_STATUS_COLORS[r.approval_status]}`}>
                      {APPROVAL_STATUS_LABELS[r.approval_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(r.refund_amount)}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.approval_status === 'pending' && (
                        <button onClick={() => approve(r.id, 'maker')} className="text-xs text-blue-600 hover:underline">Maker Approve</button>
                      )}
                      {r.approval_status === 'maker_approved' && (
                        <button onClick={() => approve(r.id, 'checker')} className="text-xs text-emerald-600 hover:underline">Checker Approve</button>
                      )}
                      {r.status === 'pending' && (
                        <button onClick={() => updateStatus(r.id, 'approved')} className="text-xs text-blue-600 hover:underline ml-2">Approve</button>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={() => updateStatus(r.id, 'received')} className="text-xs text-violet-600 hover:underline ml-2">Mark Received</button>
                      )}
                      {r.status === 'received' && (
                        <button onClick={() => updateStatus(r.id, 'refunded')} className="text-xs text-emerald-600 hover:underline ml-2">Refund</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NewReturnModal
          open={showModal}
          onClose={() => setShowModal(false)}
          orders={orders}
          onSaved={() => { load(); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function NewReturnModal({ open, onClose, orders, onSaved }: {
  open: boolean; onClose: () => void; orders: Order[]; onSaved: () => void;
}) {
  const toast = useToast();
  const [orderId, setOrderId] = useState('');
  const [returnType, setReturnType] = useState<'customer_rma' | 'failed_delivery_rts'>('customer_rma');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!orderId) { toast('Select an order', 'error'); return; }
    setSaving(true);
    const { data: rn } = await supabase.rpc('next_return_number');
    const { error } = await supabase.from('return_requests').insert({
      return_number: rn ?? `RMA-${Date.now()}`,
      order_id: orderId,
      return_type: returnType,
      reason: reason || null,
      refund_amount: refundAmount,
      status: 'pending',
      approval_status: 'pending',
    });
    setSaving(false);
    if (error) { toast('Failed: ' + error.message, 'error'); return; }
    toast('Return request created', 'success');
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Return Request" size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Create</button></>}>
      <div className="space-y-4">
        <div>
          <label className="label">Order *</label>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="input">
            <option value="">Select order...</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.order_number} — {formatCurrency(o.total)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Return Type</label>
          <select value={returnType} onChange={(e) => setReturnType(e.target.value as 'customer_rma' | 'failed_delivery_rts')} className="input">
            <option value="customer_rma">Customer RMA</option>
            <option value="failed_delivery_rts">Failed Delivery (RTS)</option>
          </select>
        </div>
        <div>
          <label className="label">Refund Amount</label>
          <input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)} className="input" />
        </div>
        <div>
          <label className="label">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input" placeholder="Return reason..." />
        </div>
      </div>
    </Modal>
  );
}
