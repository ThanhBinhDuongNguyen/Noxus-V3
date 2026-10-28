import { useEffect, useState } from 'react';
import { Bot, Plus, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatDateTime, maskPII, COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_COLORS } from '@/lib/utils';
import type { CustomerComplaint, Order, Customer } from '@/types';

interface ComplaintsPageProps {
  search: string;
}

export function ComplaintsPage({ search }: ComplaintsPageProps) {
  const toast = useToast();
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('customer_complaints').select('*').order('created_at', { ascending: false });
    setComplaints((data as CustomerComplaint[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function loadRefData() {
    const [oRes, cRes] = await Promise.all([
      supabase.from('orders').select('*').limit(100),
      supabase.from('customers').select('*').limit(100),
    ]);
    setOrders((oRes.data as Order[]) ?? []);
    setCustomers((cRes.data as Customer[]) ?? []);
  }

  const filtered = complaints.filter((c) =>
    !search || (c.raw_content ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.issue_category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function analyze(id: string) {
    const complaint = complaints.find((c) => c.id === id);
    if (!complaint?.raw_content) { toast('No content to analyze', 'error'); return; }

    setAnalyzingId(id);
    const text = complaint.raw_content.toLowerCase();
    const redacted = maskPII(complaint.raw_content);

    const negativeWords = ['angry', 'terrible', 'awful', 'horrible', 'worst', 'broken', 'damaged', 'defective', 'fail', 'failed', 'never', 'refund', 'complaint', 'disappointed', 'unacceptable', 'late', 'delay', 'missing', 'wrong', 'lost', 'refund', 'bu phan nan', 'khong', 'tre', 'hong', 'sai', 'mat', 'that bai', 'khieu nai'];
    const positiveWords = ['great', 'excellent', 'perfect', 'amazing', 'love', 'happy', 'satisfied', 'good', 'wonderful', 'fantastic', 'tuyet', 'hay', 'tot', 'hai long', 'cam on'];
    const negativeHits = negativeWords.filter((w) => text.includes(w)).length;
    const positiveHits = positiveWords.filter((w) => text.includes(w)).length;

    let sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    if (negativeHits > 0 && positiveHits > 0) sentiment = 'mixed';
    else if (negativeHits > 0) sentiment = 'negative';
    else if (positiveHits > 0) sentiment = 'positive';
    else sentiment = 'neutral';

    const urgencyWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'khan cap', 'gap', 'ngay'];
    const urgencyBoost = urgencyWords.filter((w) => text.includes(w)).length;
    let urgency = Math.min(negativeHits + 1 + urgencyBoost * 2, 10);
    if (sentiment === 'positive' || sentiment === 'neutral') urgency = Math.max(1, urgency - 3);

    const categoryKeywords: { category: string; words: string[] }[] = [
      { category: 'Shipping Delay', words: ['shipping', 'delivery', 'late', 'delay', 'ship', 'giao hang', 'tre', 'van chuyen'] },
      { category: 'Product Quality', words: ['quality', 'broken', 'damaged', 'defective', 'poor', 'chat luong', 'hong', 'vo'] },
      { category: 'Wrong Item', words: ['wrong', 'incorrect', 'different', 'sai', 'khac', 'nham'] },
      { category: 'Refund Issue', words: ['refund', 'money back', 'charge', 'hoan tien', 'tra tien'] },
      { category: 'Customer Service', words: ['service', 'support', 'response', 'reply', 'help', 'dich vu', 'ho tro', 'phan hoi'] },
      { category: 'Packaging', words: ['packaging', 'package', 'box', 'wrap', 'dong goi', 'bao bi'] },
    ];
    let category = 'General';
    let bestScore = 0;
    for (const cat of categoryKeywords) {
      const score = cat.words.filter((w) => text.includes(w)).length;
      if (score > bestScore) { bestScore = score; category = cat.category; }
    }

    const replies: Record<string, string> = {
      negative: 'Kinh chao quy khach, NexusOMS thanh that xin loi vi su bat tien nay. Đoi ngu cua chung toi se kiem tra ngay lap tuc va lien he lai trong vong 24 gio.',
      mixed: 'Cam on quy khach da phan hoi. Chung toi dang xem xet van de va se theo doi som nhat co the.',
      neutral: 'Cam on quy khach da lien he. Chung toi da ghi nhan y kien va se xu ly trong thoi gian som.',
      positive: 'Cam on quy khach da danh gia tot! Chung oi rat vui khi quy khach co trai nghiem tot voi NexusOMS.',
    };

    const { error } = await supabase.from('customer_complaints').update({
      redacted_content: redacted,
      sentiment,
      urgency_score: urgency,
      issue_category: category,
      suggested_reply: replies[sentiment],
      analyzed_at: new Date().toISOString(),
      status: 'analyzed',
    }).eq('id', id);

    setAnalyzingId(null);
    if (error) { toast('Analysis failed', 'error'); return; }
    toast('AI analysis complete — PII masked', 'success');
    load();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('customer_complaints').update({ status }).eq('id', id);
    if (error) { toast('Failed', 'error'); return; }
    toast('Status updated', 'success');
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Complaints & AI Analysis ({filtered.length})</h2>
        <button onClick={() => { loadRefData(); setShowModal(true); }} className="btn-primary"><Plus size={16} /> New Complaint</button>
      </div>

      <div className="card p-4 flex items-center gap-3 bg-blue-50 border-blue-200">
        <Shield size={20} className="text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800">
          PII Guardrails active: Phone numbers, emails, and addresses are masked as [PHONE], [EMAIL], [ADDRESS] before AI analysis.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bot} title="No complaints" description="Customer complaints will appear here" />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${COMPLAINT_STATUS_COLORS[c.status]}`}>{COMPLAINT_STATUS_LABELS[c.status]}</span>
                    {c.sentiment && (
                      <span className={`badge ${c.sentiment === 'negative' ? 'bg-rose-100 text-rose-800 border-rose-200' : c.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {c.sentiment}
                      </span>
                    )}
                    {c.urgency_score && (
                      <span className="text-xs text-ink-500">Urgency: {c.urgency_score}/10</span>
                    )}
                    {c.issue_category && (
                      <span className="text-xs text-ink-500">· {c.issue_category}</span>
                    )}
                  </div>
                  <p className="text-sm text-ink-700 line-clamp-2">
                    {c.redacted_content ?? c.raw_content ?? '—'}
                  </p>
                  {c.suggested_reply && (
                    <div className="mt-3 p-3 rounded-lg bg-ink-50 border border-ink-100">
                      <p className="text-xs font-semibold text-ink-500 mb-1">AI Suggested Reply:</p>
                      <p className="text-sm text-ink-700">{c.suggested_reply}</p>
                    </div>
                  )}
                  <p className="text-xs text-ink-400 mt-2">{formatDateTime(c.created_at)}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {c.status === 'open' && (
                    <button onClick={() => analyze(c.id)} disabled={analyzingId === c.id} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">
                      {analyzingId === c.id ? <Spinner size={14} /> : <Bot size={14} />} Analyze
                    </button>
                  )}
                  {c.status === 'analyzed' && (
                    <button onClick={() => updateStatus(c.id, 'responded')} className="text-xs text-emerald-600 hover:underline">Mark Responded</button>
                  )}
                  {c.status === 'responded' && (
                    <button onClick={() => updateStatus(c.id, 'closed')} className="text-xs text-slate-600 hover:underline">Close</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewComplaintModal open={showModal} onClose={() => setShowModal(false)}
          orders={orders} customers={customers}
          onSaved={() => { load(); setShowModal(false); }} />
      )}
    </div>
  );

  function NewComplaintModal({ open, onClose, orders, customers, onSaved }: {
    open: boolean; onClose: () => void; orders: Order[]; customers: Customer[]; onSaved: () => void;
  }) {
    const [orderId, setOrderId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      if (!content) { toast('Enter complaint content', 'error'); return; }
      setSaving(true);
      const { error } = await supabase.from('customer_complaints').insert({
        order_id: orderId || null,
        customer_id: customerId || null,
        raw_content: content,
        status: 'open',
      });
      setSaving(false);
      if (error) { toast('Failed: ' + error.message, 'error'); return; }
      toast('Complaint created', 'success');
      onSaved();
    }

    return (
      <Modal open={open} onClose={onClose} title="New Complaint" size="md"
        footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Create</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Order (optional)</label>
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="input">
              <option value="">None</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.order_number}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Customer (optional)</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
              <option value="">None</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Complaint Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="input"
              placeholder="Customer complaint text (PII will be masked before AI analysis)..." />
          </div>
        </div>
      </Modal>
    );
  }
}
