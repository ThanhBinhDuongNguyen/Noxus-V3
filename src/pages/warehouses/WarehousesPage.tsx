import { useEffect, useMemo, useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  LayoutGrid,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import type { Warehouse, WarehouseBin } from '@/types';

interface WarehousesPageProps {
  search: string;
}

interface WarehouseWithBins extends Warehouse {
  warehouse_bins?: WarehouseBin[];
}

export function WarehousesPage({ search }: WarehousesPageProps) {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<WarehouseWithBins[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Warehouse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('warehouses')
      .select('*, warehouse_bins(*)')
      .order('priority');
    setWarehouses((data ?? []) as WarehouseWithBins[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return warehouses;
    const q = search.toLowerCase();
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.address?.toLowerCase().includes(q)
    );
  }, [warehouses, search]);

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('warehouses')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) {
      toast('Cannot delete: warehouse is referenced by inventory or orders.', 'error');
      return;
    }
    toast('Warehouse deleted', 'success');
    load();
  }

  if (loading) return <FullPageSpinner label="Loading warehouses..." />;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Warehouses</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {warehouses.length} location{warehouses.length !== 1 ? 's' : ''} · manage bins and priority
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} /> Add Warehouse
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={WarehouseIcon}
            title={search ? 'No matching warehouses' : 'No warehouses yet'}
            description={
              search
                ? 'Try adjusting your search'
                : 'Add your first warehouse to start managing inventory locations'
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
                  <Plus size={16} /> Add Warehouse
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((wh) => {
            const bins = wh.warehouse_bins ?? [];
            const isOpen = expanded[wh.id] ?? false;
            return (
              <Card
                key={wh.id}
                className="p-5 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl gradient-brand-soft flex items-center justify-center shrink-0">
                      <WarehouseIcon size={20} className="text-[var(--brand-600)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink-900">{wh.name}</h3>
                        <code className="text-xs bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded font-mono">
                          {wh.code}
                        </code>
                      </div>
                      {wh.address && (
                        <p className="text-sm text-ink-500 mt-1 flex items-center gap-1.5">
                          <MapPin size={13} className="shrink-0" />
                          {wh.address}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-ink-400">Priority</span>
                        <span className="badge bg-ink-100 text-ink-600 border-ink-200">
                          P{wh.priority}
                        </span>
                        <span
                          className={cn(
                            'badge',
                            wh.is_active
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}
                        >
                          {wh.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditing(wh);
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-all hover:scale-110"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(wh)}
                      className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all hover:scale-110"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-ink-100">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [wh.id]: !isOpen }))}
                    className="flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900 transition-colors"
                  >
                    <LayoutGrid size={15} />
                    Bin Locations
                    <span className="badge bg-ink-100 text-ink-500 border-ink-200">
                      {bins.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-3 space-y-1.5 animate-fade-in">
                      {bins.length === 0 ? (
                        <p className="text-xs text-ink-400 py-2">No bin locations configured.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {bins
                            .sort((a, b) => a.picking_sequence - b.picking_sequence)
                            .map((bin) => (
                              <div
                                key={bin.id}
                                className="rounded-lg border border-ink-200 bg-ink-50/50 px-2.5 py-1.5"
                              >
                                <p className="text-xs font-mono font-semibold text-ink-700">
                                  {bin.bin_code}
                                </p>
                                <p className="text-[10px] text-ink-400">
                                  Z{bin.zone} · A{bin.aisle} · R{bin.rack}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <WarehouseFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Warehouse?"
        message={`Delete "${confirmDelete?.name}"? This cannot be undone if it has inventory or orders.`}
        confirmLabel="Delete Warehouse"
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
    if (!form.name.trim() || !form.code.trim()) {
      toast('Warehouse code and name are required', 'error');
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
        toast('Failed to update: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('Warehouse updated', 'success');
    } else {
      const { error } = await supabase.from('warehouses').insert(payload);
      if (error) {
        toast(
          error.code === '23505' ? 'Code already exists' : 'Failed to create: ' + error.message,
          'error'
        );
        setSaving(false);
        return;
      }
      toast('Warehouse created', 'success');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Warehouse' : 'Add Warehouse'}
      subtitle={editing ? 'Update warehouse details' : 'Create a new warehouse location'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            {editing ? 'Save Changes' : 'Create Warehouse'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Code *</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="WH-01"
              className="input font-mono uppercase"
            />
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Main Distribution Center"
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Logistics Blvd, City, State 00000"
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Priority</label>
            <input
              type="number"
              min={1}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Status</label>
            <button
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={cn(
                'input flex items-center justify-between cursor-pointer',
                form.is_active ? 'text-emerald-700' : 'text-ink-500'
              )}
            >
              {form.is_active ? 'Active' : 'Inactive'}
              <span
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  form.is_active ? 'bg-emerald-500' : 'bg-ink-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
