import { useEffect, useState } from 'react';
import { Zap, Plus, Trash2, Power, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/cn';
import type { OrderAutomationRule, AutomationTrigger } from '@/types';

interface AutomationRulesPageProps {
  search: string;
}

// Visual option definitions — no raw JSON for users
type ConditionField = 'order_total' | 'order_item_count' | 'payment_method' | 'channel' | 'customer_tier' | 'sla_hours_remaining';
type ConditionOperator = 'gte' | 'lte' | 'eq' | 'neq';
type ActionType = 'add_free_gift' | 'set_status' | 'assign_warehouse' | 'add_note' | 'notify_admin' | 'auto_approve';

interface ConditionOption {
  field: ConditionField;
  fieldLabel: string;
  operator: ConditionOperator;
  operatorLabel: string;
  value: string;
}

interface ActionOption {
  type: ActionType;
  label: string;
  value: string;
  valueLabel: string;
}

const CONDITION_FIELDS: { value: ConditionField; label: string; inputType: 'number' | 'text' | 'select'; options?: { value: string; label: string }[] }[] = [
  { value: 'order_total', label: 'Tong tien don hang', inputType: 'number' },
  { value: 'order_item_count', label: 'So luong san pham', inputType: 'number' },
  { value: 'payment_method', label: 'Phuong thuc thanh toan', inputType: 'select', options: [
    { value: 'cod', label: 'COD' },
    { value: 'bank_transfer', label: 'Chuyen khoan' },
    { value: 'momo', label: 'MoMo' },
  ]},
  { value: 'channel', label: 'Kenh ban hang', inputType: 'select', options: [
    { value: 'manual', label: 'truc tiep' },
    { value: 'shopee', label: 'Shopee' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'lazada', label: 'Lazada' },
  ]},
  { value: 'customer_tier', label: 'Hang khach hang', inputType: 'select', options: [
    { value: 'standard', label: 'thuong' },
    { value: 'silver', label: 'bach kim' },
    { value: 'gold', label: 'vang' },
    { value: 'platinum', label: 'bach kim cao cap' },
  ]},
  { value: 'sla_hours_remaining', label: 'Gio con lai theo SLA', inputType: 'number' },
];

const OPERATORS: { value: ConditionOperator; label: string; supportsText: boolean }[] = [
  { value: 'gte', label: 'lon hon hoac bang >=', supportsText: false },
  { value: 'lte', label: 'nho hon hoac bang <=', supportsText: false },
  { value: 'eq', label: 'bang =', supportsText: true },
  { value: 'neq', label: 'khac !=', supportsText: true },
];

const ACTION_TYPES: { value: ActionType; label: string; needsValue: boolean; valuePlaceholder: string; valueOptions?: { value: string; label: string }[] }[] = [
  { value: 'add_free_gift', label: 'Tang qua tang kem', needsValue: true, valuePlaceholder: 'Nhap ma SKU qua tang' },
  { value: 'set_status', label: 'Doi trang thai don', needsValue: true, valuePlaceholder: '', valueOptions: [
    { value: 'processing', label: 'Dang xu ly' },
    { value: 'shipped', label: 'Da giao' },
    { value: 'on_hold', label: 'Tam giu' },
    { value: 'cancelled', label: 'Huy' },
  ]},
  { value: 'assign_warehouse', label: 'Gan kho xu ly', needsValue: false, valuePlaceholder: '' },
  { value: 'add_note', label: 'Them ghi chu vao don', needsValue: true, valuePlaceholder: 'Nhap noi dung ghi chu' },
  { value: 'notify_admin', label: 'Gui canh bao den admin', needsValue: false, valuePlaceholder: '' },
  { value: 'auto_approve', label: 'Tu dong duyet don', needsValue: false, valuePlaceholder: '' },
];

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  order_created: 'Khi tao don moi',
  order_status_changed: 'Khi doi trang thai don',
  payment_received: 'Khi nhan thanh toan',
};

export function AutomationRulesPage({ search }: AutomationRulesPageProps) {
  const toast = useToast();
  const [rules, setRules] = useState<OrderAutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('order_automation_rules').select('*').order('priority', { ascending: true });
    setRules((data as OrderAutomationRule[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = rules.filter((r) =>
    !search || r.rule_name.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(rule: OrderAutomationRule) {
    const { error } = await supabase.from('order_automation_rules').update({ is_active: !rule.is_active }).eq('id', rule.id);
    if (error) { toast('Cap nhat that bai', 'error'); return; }
    toast(`Luat da ${!rule.is_active ? 'kich hoat' : 'vo hieu hoa'}`, 'success');
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('order_automation_rules').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) { toast('Xoa that bai', 'error'); return; }
    toast('Da xoa luat', 'success');
    load();
  }

  // Parse conditions_json into human-readable text
  function describeCondition(conditions: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [field, val] of Object.entries(conditions)) {
      const fieldDef = CONDITION_FIELDS.find((f) => f.value === field);
      if (!fieldDef) { parts.push(`${field}: ${JSON.stringify(val)}`); continue; }
      if (typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>;
        for (const [op, opVal] of Object.entries(v)) {
          const opDef = OPERATORS.find((o) => o.value === op);
          const opText = opDef ? opDef.label.split(' ')[0] : op;
          parts.push(`${fieldDef.label} ${opText} ${opVal}`);
        }
      } else {
        parts.push(`${fieldDef.label} = ${val}`);
      }
    }
    return parts.join(' VA ');
  }

  // Parse actions_json into human-readable text
  function describeAction(actions: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(actions)) {
      const actionDef = ACTION_TYPES.find((a) => a.value === key);
      if (actionDef) {
        if (val === true) {
          parts.push(actionDef.label);
        } else {
          parts.push(`${actionDef.label}: ${val}`);
        }
      } else {
        parts.push(`${key}: ${val}`);
      }
    }
    return parts.join(' + ');
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Luat tu dong ({filtered.length})</h2>
          <p className="text-sm text-ink-500 mt-0.5">Tao luat IF-THEN de tu dong hoa don hang</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0"><Plus size={16} /> Tao luat</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Zap} title="Chua co luat tu dong" description="Tao luat IF-THEN de tu dong: tang qua, doi trang thai, canh bao..." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className={cn('card p-4 sm:p-5', !r.is_active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    r.is_active ? 'bg-amber-100' : 'bg-ink-100'
                  )}>
                    <Zap size={18} className={r.is_active ? 'text-amber-600' : 'text-ink-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-ink-800 text-sm">{r.rule_name}</h3>
                      <span className="text-xs text-ink-400">Uu tien {r.priority}</span>
                      <span className="badge bg-violet-100 text-violet-700 border-violet-200 text-[10px]">
                        {TRIGGER_LABELS[r.trigger_event]}
                      </span>
                      {r.is_active ? (
                        <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Dang hoat dong</span>
                      ) : (
                        <span className="badge bg-ink-100 text-ink-500 border-ink-200 text-[10px]">Vo hieu</span>
                      )}
                    </div>

                    {/* IF / THEN visual */}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-1 flex items-center gap-1">
                          <span className="w-4 h-4 rounded bg-sky-600 text-white flex items-center justify-center text-[8px] font-bold">IF</span>
                          Dieu kien
                        </p>
                        <p className="text-sm text-ink-700">{describeCondition(r.conditions_json)}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1 flex items-center gap-1">
                          <span className="w-4 h-4 rounded bg-amber-600 text-white flex items-center justify-center text-[8px] font-bold">THEN</span>
                          Hanh dong
                        </p>
                        <p className="text-sm text-ink-700">{describeAction(r.actions_json)}</p>
                      </div>
                    </div>

                    <p className="text-xs text-ink-400 mt-2">Tao {formatDate(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(r)} className={cn('p-2 rounded-lg transition-all', r.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-ink-400 hover:bg-ink-100')} title={r.is_active ? 'Vo hieu hoa' : 'Kich hoat'}>
                    <Power size={18} />
                  </button>
                  <button onClick={() => setDeleteId(r.id)} className="p-2 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewRuleModal open={showModal} onClose={() => setShowModal(false)} onSaved={() => { load(); setShowModal(false); }} />}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Xoa luat?" message="Luat tu dong nay se bi xoa vinh vien." confirmLabel="Xoa" />
    </div>
  );
}

function NewRuleModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(100);
  const [trigger, setTrigger] = useState<AutomationTrigger>('order_created');

  // Condition state
  const [condField, setCondField] = useState<ConditionField>('order_total');
  const [condOp, setCondOp] = useState<ConditionOperator>('gte');
  const [condValue, setCondValue] = useState('500000');

  // Action state
  const [actionType, setActionType] = useState<ActionType>('add_free_gift');
  const [actionValue, setActionValue] = useState('');

  const [saving, setSaving] = useState(false);

  const fieldDef = CONDITION_FIELDS.find((f) => f.value === condField)!;
  const actionDef = ACTION_TYPES.find((a) => a.value === actionType)!;
  const availableOps = OPERATORS.filter((o) => fieldDef.inputType === 'select' ? o.supportsText : !o.supportsText || o.supportsText);

  async function handleSave() {
    if (!name.trim()) { toast('Vui long nhap ten luat', 'error'); return; }
    if (!condValue.trim() && fieldDef.inputType !== 'select') { toast('Vui long nhap gia tri dieu kien', 'error'); return; }
    if (actionDef.needsValue && !actionValue.trim()) { toast('Vui long nhap gia tri hanh dong', 'error'); return; }

    // Build conditions_json
    const conditions: Record<string, unknown> = {};
    if (fieldDef.inputType === 'select') {
      conditions[condField] = condValue;
    } else {
      conditions[condField] = { [condOp]: fieldDef.inputType === 'number' ? Number(condValue) : condValue };
    }

    // Build actions_json
    const actions: Record<string, unknown> = {};
    if (actionDef.needsValue) {
      actions[actionType] = actionValue;
    } else {
      actions[actionType] = true;
    }

    setSaving(true);
    const { error } = await supabase.from('order_automation_rules').insert({
      rule_name: name.trim(),
      priority,
      trigger_event: trigger,
      conditions_json: conditions,
      actions_json: actions,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast('Tao luat that bai: ' + error.message, 'error'); return; }
    toast('Da tao luat tu dong', 'success');
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tao luat tu dong moi"
      subtitle="Cau hinh IF-THEN bang cac tuy chon — khong can viet code"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Huy</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            Tao luat
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Ten luat *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="VD: Tang qua don tren 500K" />
          </div>
          <div>
            <label className="label">Do uu tien</label>
            <input type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 100)} className="input" />
            <p className="text-[10px] text-ink-400 mt-1">So nho chay truoc</p>
          </div>
        </div>

        <div>
          <label className="label">Su kien kich hoat</label>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(TRIGGER_LABELS) as [AutomationTrigger, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTrigger(val)}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-medium border transition-all',
                  trigger === val
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white border-ink-200 text-ink-600 hover:border-ink-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* IF condition builder */}
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-bold">IF</span>
            <p className="text-sm font-semibold text-sky-800">Khi dieu kien nao duoc thoa man</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label text-[11px]">Truong dieu kien</label>
              <select value={condField} onChange={(e) => {
                setCondField(e.target.value as ConditionField);
                const fd = CONDITION_FIELDS.find((f) => f.value === e.target.value)!;
                setCondValue(fd.inputType === 'number' ? '500000' : fd.inputType === 'select' ? (fd.options?.[0]?.value ?? '') : '');
              }} className="input">
                {CONDITION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-[11px]">Toan tu</label>
              <select value={condOp} onChange={(e) => setCondOp(e.target.value as ConditionOperator)} className="input" disabled={fieldDef.inputType === 'select'}>
                {(fieldDef.inputType === 'select' ? OPERATORS.filter((o) => o.value === 'eq') : OPERATORS).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-[11px]">Gia tri</label>
              {fieldDef.inputType === 'select' ? (
                <select value={condValue} onChange={(e) => setCondValue(e.target.value)} className="input">
                  {fieldDef.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={fieldDef.inputType}
                  value={condValue}
                  onChange={(e) => setCondValue(e.target.value)}
                  className="input"
                  placeholder={fieldDef.inputType === 'number' ? '500000' : 'Nhap gia tri'}
                />
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-white/80 px-3 py-2 text-sm text-sky-700 flex items-center gap-2">
            <Sparkles size={14} className="shrink-0" />
            <span>
              {fieldDef.label}{' '}
              {OPERATORS.find((o) => o.value === condOp)?.label.split(' ')[0]}{' '}
              <strong>{condValue}</strong>
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center -my-1">
          <ArrowRight size={20} className="text-ink-300 rotate-90" />
        </div>

        {/* THEN action builder */}
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold">THEN</span>
            <p className="text-sm font-semibold text-amber-800">Thuc hien hanh dong gi</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="label text-[11px]">Chon hanh dong</label>
              <select value={actionType} onChange={(e) => {
                setActionType(e.target.value as ActionType);
                setActionValue('');
              }} className="input">
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            {actionDef.needsValue && (
              <div>
                <label className="label text-[11px]">Gia tri</label>
                {actionDef.valueOptions ? (
                  <select value={actionValue} onChange={(e) => setActionValue(e.target.value)} className="input">
                    <option value="">-- Chon --</option>
                    {actionDef.valueOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={actionType === 'add_free_gift' ? 'text' : 'text'}
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    className="input"
                    placeholder={actionDef.valuePlaceholder}
                  />
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-white/80 px-3 py-2 text-sm text-amber-700 flex items-center gap-2">
            <Sparkles size={14} className="shrink-0" />
            <span>
              <strong>{actionDef.label}</strong>
              {actionDef.needsValue && actionValue && `: ${actionValue}`}
            </span>
          </div>
        </div>

        {/* Full preview */}
        <div className="rounded-xl bg-ink-900 px-4 py-3 text-white">
          <p className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">Tong ket luat</p>
          <p className="text-sm">
            <span className="text-sky-400 font-semibold">IF</span> {fieldDef.label}{' '}
            {OPERATORS.find((o) => o.value === condOp)?.label.split(' ')[0]} {condValue}{' '}
            <span className="text-amber-400 font-semibold">THEN</span> {actionDef.label}
            {actionDef.needsValue && actionValue && `: ${actionValue}`}
          </p>
        </div>
      </div>
    </Modal>
  );
}
