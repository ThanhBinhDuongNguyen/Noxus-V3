import { useEffect, useState } from 'react';
import { Banknote, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDateTime, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/lib/utils';
import type { JournalEntry, LedgerAccount, JournalLine } from '@/types';

interface LedgerPageProps {
  search: string;
}

export function LedgerPage({ search }: LedgerPageProps) {
  const toast = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([]);

  async function load() {
    setLoading(true);
    const [eRes, aRes] = await Promise.all([
      supabase.from('journal_entries').select('*').order('posted_at', { ascending: false }).limit(100),
      supabase.from('ledger_accounts').select('*').order('account_code'),
    ]);
    setEntries((eRes.data as JournalEntry[]) ?? []);
    setAccounts((aRes.data as LedgerAccount[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = entries.filter((e) =>
    !search || e.entry_number.toLowerCase().includes(search.toLowerCase()) ||
    (e.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function viewLines(entry: JournalEntry) {
    setSelectedEntry(entry);
    const { data } = await supabase
      .from('journal_lines')
      .select('*, account:ledger_accounts(*)')
      .eq('journal_entry_id', entry.id);
    setLines((data as JournalLine[]) ?? []);
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit_amount), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit_amount), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Journal Entries ({filtered.length})</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Entry</button>
      </div>

      {/* Account summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map((type) => (
          <div key={type} className="card p-4">
            <span className={`badge ${ACCOUNT_TYPE_COLORS[type]} mb-2`}>{ACCOUNT_TYPE_LABELS[type]}</span>
            <p className="text-2xl font-bold text-ink-900">{accounts.filter((a) => a.account_type === type).length}</p>
            <p className="text-xs text-ink-400">accounts</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Banknote} title="No journal entries" description="Create a double-entry to get started" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Entry #</th>
                <th className="text-left px-4 py-3 font-semibold">Source</th>
                <th className="text-left px-4 py-3 font-semibold">Description</th>
                <th className="text-left px-4 py-3 font-semibold">Reference</th>
                <th className="text-left px-4 py-3 font-semibold">Posted</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 font-medium text-ink-800">{e.entry_number}</td>
                  <td className="px-4 py-3 text-ink-600 capitalize">{e.event_source.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-ink-600">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{e.reference_id ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{formatDateTime(e.posted_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => viewLines(e)} className="text-xs text-blue-600 hover:underline">View Lines</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View lines modal */}
      {selectedEntry && (
        <Modal open={!!selectedEntry} onClose={() => setSelectedEntry(null)}
          title={`Journal Lines — ${selectedEntry.entry_number}`} size="lg"
          footer={<><div className="flex-1" /><button onClick={() => setSelectedEntry(null)} className="btn-secondary">Close</button></>}>
          <div className="space-y-4">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Account</th>
                  <th className="text-right px-3 py-2 font-semibold">Debit</th>
                  <th className="text-right px-3 py-2 font-semibold">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-ink-700">{l.account?.account_code} — {l.account?.account_name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Number(l.debit_amount) > 0 ? formatCurrency(Number(l.debit_amount)) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Number(l.credit_amount) > 0 ? formatCurrency(Number(l.credit_amount)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-200">
                <tr className="font-bold">
                  <td className="px-3 py-2">Totals</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totalDebit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
            <div className={`badge ${isBalanced ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
              {isBalanced ? 'Balanced: Debit == Credit' : `Unbalanced: diff ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <NewEntryModal open={showModal} onClose={() => setShowModal(false)} accounts={accounts}
          onSaved={() => { load(); setShowModal(false); }} />
      )}
    </div>
  );

  function NewEntryModal({ open, onClose, accounts, onSaved }: {
    open: boolean; onClose: () => void; accounts: LedgerAccount[]; onSaved: () => void;
  }) {
    const [source, setSource] = useState('manual');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [debitAccount, setDebitAccount] = useState('');
    const [creditAccount, setCreditAccount] = useState('');
    const [amount, setAmount] = useState(0);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      if (!debitAccount || !creditAccount || amount <= 0) { toast('Fill all fields', 'error'); return; }
      setSaving(true);
      const { data: jeNum } = await supabase.rpc('next_journal_entry_number');
      const { data: je, error: jeErr } = await supabase.from('journal_entries').insert({
        entry_number: jeNum ?? `JE-${Date.now()}`,
        event_source: source,
        description: description || null,
        reference_id: reference || null,
      }).select().single();
      if (jeErr || !je) { toast('Failed: ' + (jeErr?.message ?? ''), 'error'); setSaving(false); return; }
      const { error: lErr } = await supabase.from('journal_lines').insert([
        { journal_entry_id: je.id, account_id: debitAccount, debit_amount: amount, credit_amount: 0 },
        { journal_entry_id: je.id, account_id: creditAccount, debit_amount: 0, credit_amount: amount },
      ]);
      setSaving(false);
      if (lErr) { toast('Lines failed: ' + lErr.message, 'error'); return; }
      toast('Journal entry created', 'success');
      onSaved();
    }

    return (
      <Modal open={open} onClose={onClose} title="New Journal Entry" size="md"
        footer={<><button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Create</button></>}>
        <div className="space-y-4">
          <div><label className="label">Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Entry description..." /></div>
          <div><label className="label">Reference</label><input value={reference} onChange={(e) => setReference(e.target.value)} className="input" placeholder="Reference ID..." /></div>
          <div>
            <label className="label">Debit Account *</label>
            <select value={debitAccount} onChange={(e) => setDebitAccount(e.target.value)} className="input">
              <option value="">Select...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Credit Account *</label>
            <select value={creditAccount} onChange={(e) => setCreditAccount(e.target.value)} className="input">
              <option value="">Select...</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
            </select>
          </div>
          <div><label className="label">Amount *</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="input" /></div>
        </div>
      </Modal>
    );
  }
}
