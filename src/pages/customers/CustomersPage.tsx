import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Mail,
  Phone,
  Building2,
  MapPin,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { onPrimaryAction } from '@/lib/events';
import {
  formatDate,
  formatCurrency,
  initials,
  CUSTOMER_STATUS_COLORS,
  CUSTOMER_STATUS_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { Customer, CustomerInput, CustomerStatus, Order } from '@/types';

interface CustomersPageProps {
  search: string;
}

const STATUS_OPTIONS: CustomerStatus[] = ['active', 'inactive', 'lead'];

export function CustomersPage({ search }: CustomersPageProps) {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    return onPrimaryAction('customers', () => {
      setEditing(null);
      setShowForm(true);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  async function viewCustomer(customer: Customer) {
    setViewing(customer);
    setShowDrawer(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customer.id)
      .order('placed_at', { ascending: false });
    setCustomerOrders(data ?? []);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) {
      toast('Xoa khach hang that bai: ' + error.message, 'error');
      return;
    }
    toast('Da xoa khach hang', 'success');
    load();
  }

  if (loading) return <FullPageSpinner label="Dang tai khach hang..." />;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up">
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={search ? 'Khong tim thay khach hang' : 'Chua co khach hang'}
            description={
              search
                ? 'Thu dieu chinh tim kiem'
                : 'Them khach hang dau tien de bat dau tao don'
            }
            action={
              !search && (
                <button
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                  className="btn-primary"
                >
                  Them khach hang
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <Card
              key={customer.id}
              className="p-5 hover:shadow-lg hover:shadow-ink-200/40 transition-all duration-300 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md shadow-brand-200/50">
                  {initials(customer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink-900 truncate">
                    {customer.name}
                  </h3>
                  {customer.company && (
                    <p className="text-sm text-ink-400 truncate flex items-center gap-1">
                      <Building2 size={12} />
                      {customer.company}
                    </p>
                  )}
                </div>
                <span className={cn('badge', CUSTOMER_STATUS_COLORS[customer.status])}>
                  {CUSTOMER_STATUS_LABELS[customer.status]}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-sm">
                {customer.email && (
                  <p className="text-ink-500 flex items-center gap-2 truncate">
                    <Mail size={14} className="text-ink-400 shrink-0" />
                    {customer.email}
                  </p>
                )}
                {customer.phone && (
                  <p className="text-ink-500 flex items-center gap-2">
                    <Phone size={14} className="text-ink-400 shrink-0" />
                    {customer.phone}
                  </p>
                )}
                {(customer.city || customer.state) && (
                  <p className="text-ink-500 flex items-center gap-2 truncate">
                    <MapPin size={14} className="text-ink-400 shrink-0" />
                    {[customer.city, customer.state]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between">
                <span className="text-xs text-ink-400">
                  Them {formatDate(customer.created_at)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => viewCustomer(customer)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-brand-50 transition-all hover:scale-110"
                    title="Xem"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(customer);
                      setShowForm(true);
                    }}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-all hover:scale-110"
                    title="Sua"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(customer)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all hover:scale-110"
                    title="Xoa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CustomerFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />

      {viewing && showDrawer && (
        <Drawer
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
          title={viewing.name}
          subtitle={viewing.company ?? undefined}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-brand-200/50">
                {initials(viewing.name)}
              </div>
              <div>
                <span className={cn('badge', CUSTOMER_STATUS_COLORS[viewing.status])}>
                  {CUSTOMER_STATUS_LABELS[viewing.status]}
                </span>
                <p className="text-xs text-ink-400 mt-2">
                  Khach hang tu {formatDate(viewing.created_at)}
                </p>
              </div>
            </div>

            <Card className="p-5 space-y-3">
              <p className="text-sm font-semibold text-ink-700">
                Thong tin lien lac
              </p>
              {viewing.email && (
                <DetailRow icon={Mail} label="Email" value={viewing.email} />
              )}
              {viewing.phone && (
                <DetailRow icon={Phone} label="Dien thoai" value={viewing.phone} />
              )}
              {viewing.company && (
                <DetailRow icon={Building2} label="Cong ty" value={viewing.company} />
              )}
              {(viewing.address || viewing.city || viewing.state) && (
                <DetailRow
                  icon={MapPin}
                  label="Dia chi"
                  value={[
                    viewing.address,
                    [viewing.city, viewing.state, viewing.postal_code]
                      .filter(Boolean)
                      .join(', '),
                    viewing.country,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                />
              )}
              {viewing.notes && (
                <div className="pt-3 border-t border-ink-100">
                  <p className="text-xs text-ink-400 font-medium mb-1">Ghi chu</p>
                  <p className="text-sm text-ink-700 whitespace-pre-wrap">
                    {viewing.notes}
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <p className="text-sm font-semibold text-ink-700 mb-3">
                Lich su don hang ({customerOrders.length})
              </p>
              {customerOrders.length === 0 ? (
                <p className="text-sm text-ink-400 py-4 text-center">
                  Chua co don hang
                </p>
              ) : (
                <div className="space-y-1">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2.5 border-b border-ink-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-800">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-ink-400">
                          {formatDate(order.placed_at)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-ink-900 tabular-nums">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 mt-2 border-t border-ink-100 flex justify-between">
                    <span className="text-sm font-medium text-ink-600">
                      Tong gia tri don hang
                    </span>
                    <span className="text-sm font-bold text-ink-900 tabular-nums">
                      {formatCurrency(customerOrders.reduce((s, o) => s + Number(o.total), 0))}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </Drawer>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xoa khach hang?"
        message={`Se xoa vinh vien ${confirmDelete?.name}. Don hang cua khach hang cung se bi xoa. Khong the hoan tac.`}
        confirmLabel="Xoa khach hang"
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-ink-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-400 font-medium">{label}</p>
        <p className="text-sm text-ink-800 whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  );
}

interface CustomerFormModalProps {
  open: boolean;
  editing: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

function CustomerFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerInput>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Vietnam',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          email: editing.email ?? '',
          phone: editing.phone ?? '',
          company: editing.company ?? '',
          address: editing.address ?? '',
          city: editing.city ?? '',
          state: editing.state ?? '',
          postal_code: editing.postal_code ?? '',
          country: editing.country,
          status: editing.status,
          notes: editing.notes ?? '',
        });
      } else {
        setForm({
          name: '',
          email: '',
          phone: '',
          company: '',
          address: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'Vietnam',
          status: 'active',
          notes: '',
        });
      }
    }
  }, [open, editing]);

  async function handleSave() {
    if (!form.name.trim()) {
      toast('Vui long nhap ten khach hang', 'error');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast('Email khong dung dinh dang', 'error');
      return;
    }
    if (form.phone && !/^[0-9+\s-()]{7,15}$/.test(form.phone)) {
      toast('So dien thoai khong dung dinh dang', 'error');
      return;
    }
    setSaving(true);
    const payload: CustomerInput = {
      ...form,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      company: form.company?.trim() || null,
      address: form.address?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      notes: form.notes?.trim() || null,
    };

    if (editing) {
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editing.id);
      if (error) {
        toast('Cap nhat khach hang that bai: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('Da cap nhat khach hang', 'success');
    } else {
      const { error } = await supabase.from('customers').insert(payload);
      if (error) {
        toast('Tao khach hang that bai: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('Da them khach hang', 'success');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Sua khach hang' : 'Them khach hang'}
      subtitle={editing ? 'Cap nhat thong tin khach hang' : 'Tao khach hang moi'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Huy
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            {editing ? 'Luu thay doi' : 'Them khach hang'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Ten *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nguyen Van A"
              className="input"
            />
          </div>
          <div>
            <label className="label">Cong ty</label>
            <input
              value={form.company ?? ''}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Cong ty ABC"
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nguyenvana@email.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">Dien thoai</label>
            <input
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0901234567"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Dia chi</label>
          <input
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Duong Le Loi"
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Thanh pho</label>
            <input
              value={form.city ?? ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Tinh/TP</label>
            <input
              value={form.state ?? ''}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Ma buu chinh</label>
            <input
              value={form.postal_code ?? ''}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Quoc gia</label>
            <input
              value={form.country ?? ''}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Trang thai</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setForm({ ...form, status: s })}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
                  form.status === s
                    ? CUSTOMER_STATUS_COLORS[s] + ' border-current'
                    : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                )}
              >
                {CUSTOMER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Ghi chu</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Ghi chu noi bo ve khach hang nay..."
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}
