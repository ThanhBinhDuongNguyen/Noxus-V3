import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Shield, Users as UsersIcon, ToggleLeft, ToggleRight, Warehouse as WarehouseIcon, Plus, Pencil, Trash2, MapPin, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { useRole, useAuth } from '@/providers/AuthProvider';
import type { Profile, UserRole, Warehouse } from '@/types';

interface SettingsPageProps {
  search: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quan tri vien',
  manager: 'Quan ly',
  warehouse: 'Nhan vien kho',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-rose-100 text-rose-800 border-rose-200',
  manager: 'bg-blue-100 text-blue-800 border-blue-200',
  warehouse: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

type Tab = 'rbac' | 'warehouses';

export function SettingsPage({ search }: SettingsPageProps) {
  const [tab, setTab] = useState<Tab>('rbac');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Cai dat & Phan quyen</h2>
      </div>

      <div className="flex gap-1 border-b border-ink-200">
        <button
          onClick={() => setTab('rbac')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            tab === 'rbac'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-500 hover:text-ink-700'
          )}
        >
          <Shield size={16} className="inline mr-2 -mt-0.5" />
          Phan quyen & Nguoi dung
        </button>
        <button
          onClick={() => setTab('warehouses')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            tab === 'warehouses'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-500 hover:text-ink-700'
          )}
        >
          <WarehouseIcon size={16} className="inline mr-2 -mt-0.5" />
          Kho & Vi tri
        </button>
      </div>

      {tab === 'rbac' ? <RbacTab search={search} /> : <WarehousesTab search={search} />}
    </div>
  );
}

function RbacTab({ search }: { search: string }) {
  const toast = useToast();
  const { isAdmin } = useRole();
  const { activeTenant } = useAuth();
  const tenantId = activeTenant?.id;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { toast('Loi tai danh sach', 'error'); setProfiles([]); }
    else { setProfiles(data as Profile[]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = profiles.filter((p) =>
    !search || p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(p: Profile) {
    const { error } = await supabase.rpc('admin_update_profile', {
      p_user_id: p.id,
      p_role: p.role,
      p_is_active: !p.is_active,
      p_tenant_id: tenantId,
    });
    if (error) { toast('Cap nhat that bai: ' + error.message, 'error'); return; }
    toast(`Tai khoan da ${!p.is_active ? 'kich hoat' : 'vo hieu hoa'}`, 'success');
    load();
  }

  async function changeRole(p: Profile, newRole: UserRole) {
    if (newRole === p.role) return;
    const { error } = await supabase.rpc('admin_update_profile', {
      p_user_id: p.id,
      p_role: newRole,
      p_is_active: p.is_active,
      p_tenant_id: tenantId,
    });
    if (error) { toast('Doi vai tro that bai: ' + error.message, 'error'); return; }
    toast('Da doi vai tro', 'success');
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => setShowCreateForm(true)} className="btn-primary">
            <UserPlus size={16} /> Them nguoi dung
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center"><Shield size={20} className="text-rose-600" /></div>
            <p className="text-sm text-ink-400">Quan tri vien</p>
          </div>
          <p className="text-2xl font-bold text-ink-900">{profiles.filter((p) => p.role === 'admin').length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><SettingsIcon size={20} className="text-blue-600" /></div>
            <p className="text-sm text-ink-400">Quan ly</p>
          </div>
          <p className="text-2xl font-bold text-ink-900">{profiles.filter((p) => p.role === 'manager').length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><UsersIcon size={20} className="text-emerald-600" /></div>
            <p className="text-sm text-ink-400">Nhan vien kho</p>
          </div>
          <p className="text-2xl font-bold text-ink-900">{profiles.filter((p) => p.role === 'warehouse').length}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Chua co nguoi dung" description="Nguoi dung se xuat hien sau khi dang ky tai khoan" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nguoi dung</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Vai tro</th>
                <th className="text-center px-4 py-3 font-semibold">Trang thai</th>
                <th className="text-left px-4 py-3 font-semibold">Ngay tao</th>
                <th className="text-center px-4 py-3 font-semibold">Hanh dong</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                        {p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-ink-800">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-600 text-xs">{p.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={(e) => changeRole(p, e.target.value as UserRole)}
                      className={`text-xs font-medium rounded-full border px-3 py-1 cursor-pointer ${ROLE_COLORS[p.role]}`}
                    >
                      <option value="admin">Quan tri vien</option>
                      <option value="manager">Quan ly</option>
                      <option value="warehouse">Nhan vien kho</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(p)} className="inline-flex items-center gap-1">
                      {p.is_active ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} className="text-ink-400" />}
                      <span className="text-xs text-ink-500">{p.is_active ? 'Hoat dong' : 'Vo hieu'}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{formatDateTime(p.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${ROLE_COLORS[p.role]}`}>{ROLE_LABELS[p.role]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-ink-800 mb-3">Mo ta phan quyen</h3>
        <div className="space-y-3 text-sm text-ink-600">
          <div className="flex gap-3"><Shield size={16} className="text-rose-600 shrink-0 mt-0.5" /><div><span className="font-medium text-ink-800">Quan tri vien:</span> Truy cap toan bo he thong, quan ly nguoi dung, xoa du lieu, cau hinh webhook & audit trail</div></div>
          <div className="flex gap-3"><SettingsIcon size={16} className="text-blue-600 shrink-0 mt-0.5" /><div><span className="font-medium text-ink-800">Quan ly:</span> Quan ly don hang, san pham, kho, tai chinh, luat tu dong — khong duoc xoa du lieu hoac quan ly nguoi dung</div></div>
          <div className="flex gap-3"><UsersIcon size={16} className="text-emerald-600 shrink-0 mt-0.5" /><div><span className="font-medium text-ink-800">Nhan vien kho:</span> Xu ly don hang, ton kho, chuyen kho, wave picking — khong truy cap tai chinh hoac quan tri</div></div>
        </div>
      </div>

      {showCreateForm && (
        <CreateUserModal
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSaved={() => { load(); setShowCreateForm(false); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const tenantId = activeTenant?.id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'warehouse' as UserRole,
  });

  useEffect(() => {
    if (open) {
      setForm({ email: '', password: '', fullName: '', role: 'warehouse' });
    }
  }, [open]);

  async function handleSave() {
    if (!form.email.trim()) { toast('Vui long nhap email', 'error'); return; }
    if (!form.fullName.trim()) { toast('Vui long nhap ho ten', 'error'); return; }
    if (form.password.length < 6) { toast('Mat khau phai co it nhat 6 ky tu', 'error'); return; }

    setSaving(true);
    const { error } = await supabase.rpc('admin_create_user', {
      p_email: form.email.trim(),
      p_password: form.password,
      p_full_name: form.fullName.trim(),
      p_role: form.role,
      p_tenant_id: tenantId,
    });
    setSaving(false);
    if (error) {
      const msg = error.message.includes('already registered')
        ? 'Email da duoc dang ky'
        : 'Tao tai khoan that bai: ' + error.message;
      toast(msg, 'error');
      return;
    }
    toast('Da tao tai khoan moi', 'success');
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Them nguoi dung moi"
      subtitle="Tao tai khoan voi vai tro quyen tuong ung"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Huy</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            Tao tai khoan
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Ho ten *</label>
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Nguyen Van A"
            className="input"
          />
        </div>
        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="user@nexusoms.vn"
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Mat khau *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Toi thieu 6 ky tu"
              className="input"
            />
          </div>
          <div>
            <label className="label">Vai tro</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="input"
            >
              <option value="warehouse">Nhan vien kho</option>
              <option value="manager">Quan ly</option>
              <option value="admin">Quan tri vien</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function WarehousesTab({ search }: { search: string }) {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Warehouse | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('warehouses').select('*').order('priority');
    setWarehouses((data ?? []) as Warehouse[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = warehouses.filter((w) =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.code.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase.from('warehouses').delete().eq('id', confirmDelete.id);
    if (error) {
      toast('Khong the xoa: kho da co ton kho hoac don hang', 'error');
      return;
    }
    toast('Da xoa kho', 'success');
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{warehouses.length} kho</p>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus size={16} /> Them kho
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={WarehouseIcon} title={search ? 'Khong tim thay kho' : 'Chua co kho'} description={search ? 'Thu dieu chinh tim kiem' : 'Them kho dau tien de bat dau quan ly ton kho'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wh) => (
            <div key={wh.id} className="card p-5 group hover:shadow-lg hover:shadow-ink-200/40 transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <WarehouseIcon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink-900">{wh.name}</h3>
                    <code className="text-xs bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded font-mono">{wh.code}</code>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(wh); setShowForm(true); }} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-all">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmDelete(wh)} className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {wh.address && (
                <p className="text-sm text-ink-500 mt-3 flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0" />
                  {wh.address}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <span className="badge bg-ink-100 text-ink-600 border-ink-200">Uu tien P{wh.priority}</span>
                <span className={cn('badge', wh.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>
                  {wh.is_active ? 'Hoat dong' : 'Ngung'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <WarehouseFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => { load(); setShowForm(false); }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xoa kho?"
        message={`Xoa "${confirmDelete?.name}"? Khong the xoa neu kho da co ton kho hoac don hang.`}
        confirmLabel="Xoa kho"
      />
    </div>
  );
}

interface FormProps {
  open: boolean;
  editing: Warehouse | null;
  onClose: () => void;
  onSaved: () => void;
}

function WarehouseFormModal({ open, editing, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    priority: 1,
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              code: editing.code,
              name: editing.name,
              address: editing.address ?? '',
              priority: editing.priority,
              is_active: editing.is_active,
            }
          : { code: '', name: '', address: '', priority: 1, is_active: true }
      );
    }
  }, [open, editing]);

  async function handleSave() {
    if (!form.name.trim()) {
      toast('Vui long nhap ten kho', 'error');
      return;
    }
    if (!form.code.trim()) {
      toast('Vui long nhap ma kho', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      address: form.address.trim() || null,
      priority: Number(form.priority) || 1,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from('warehouses').update(payload).eq('id', editing.id);
      if (error) {
        toast('Cap nhat that bai: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('Da cap nhat kho', 'success');
    } else {
      const { error } = await supabase.from('warehouses').insert(payload);
      if (error) {
        toast(error.code === '23505' ? 'Ma kho da ton tai' : 'Tao kho that bai: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('Da tao kho moi', 'success');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Sua kho' : 'Them kho moi'}
      subtitle={editing ? 'Cap nhat thong tin kho' : 'Tao kho moi de quan ly ton kho'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Huy</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            {editing ? 'Luu thay doi' : 'Tao kho'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Ma kho *</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="WH-HN"
              className="input font-mono uppercase"
            />
          </div>
          <div>
            <label className="label">Ten kho *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Kho Ha Noi"
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label">Dia chi</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="So nha, duong, quan, TP"
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Do uu tien</label>
            <input
              type="number"
              min={1}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Trang thai</label>
            <button
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={cn(
                'input flex items-center justify-between cursor-pointer',
                form.is_active ? 'text-emerald-700' : 'text-ink-500'
              )}
            >
              {form.is_active ? 'Hoat dong' : 'Ngung'}
              <span className={cn('w-10 h-5 rounded-full transition-colors relative', form.is_active ? 'bg-emerald-500' : 'bg-ink-200')}>
                <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', form.is_active ? 'translate-x-5' : 'translate-x-0.5')} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
