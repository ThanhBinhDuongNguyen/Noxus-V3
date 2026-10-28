import type {
  OrderStatus,
  PaymentStatus,
  CustomerStatus,
  ProductStatus,
  Channel,
  TransferStatus,
  POStatus,
  WaveStatus,
  AccountType,
  ReturnStatus,
  ComplaintStatus,
  SerialStatus,
  InventoryTxnType,
  ApprovalStatus,
} from '@/types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'vua xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phut truoc`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} gio truoc`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngay truoc`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} thang truoc`;
  return `${Math.floor(months / 12)} nam truoc`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Cho xu ly',
  processing: 'Dang xu ly',
  shipped: 'Da giao',
  delivered: 'Da nhan',
  cancelled: 'Da huy',
  refunded: 'Da hoan tien',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chua thanh toan',
  paid: 'Da thanh toan',
  partially_paid: 'Thanh toan mot phan',
  refunded: 'Da hoan tien',
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Hoat dong',
  inactive: 'Ngung',
  lead: 'Tiem nang',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Dang ban',
  discontinued: 'Ngung ban',
  out_of_stock: 'Het hang',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-violet-100 text-violet-800 border-violet-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  refunded: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid: 'bg-rose-100 text-rose-800 border-rose-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  partially_paid: 'bg-amber-100 text-amber-800 border-amber-200',
  refunded: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  lead: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  discontinued: 'bg-slate-100 text-slate-700 border-slate-200',
  out_of_stock: 'bg-rose-100 text-rose-800 border-rose-200',
};

// ============ Enterprise v3.0 Labels & Colors ============

export const CHANNEL_LABELS: Record<Channel, string> = {
  website: 'Website',
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
  lazada: 'Lazada',
  manual: 'Thu cong',
};

export const CHANNEL_COLORS: Record<Channel, string> = {
  website: 'bg-blue-100 text-blue-800 border-blue-200',
  shopee: 'bg-orange-100 text-orange-800 border-orange-200',
  tiktok: 'bg-slate-100 text-slate-800 border-slate-300',
  lazada: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  manual: 'bg-ink-100 text-ink-600 border-ink-200',
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  requested: 'Yeu cau',
  in_transit: 'Dang van chuyen',
  received: 'Da nhan',
  cancelled: 'Da huy',
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  requested: 'bg-amber-100 text-amber-800 border-amber-200',
  in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
  received: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Nhap',
  ordered: 'Da dat',
  partial: 'Nhan mot phan',
  received: 'Da nhan',
  cancelled: 'Da huy',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  ordered: 'bg-blue-100 text-blue-800 border-blue-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  received: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const WAVE_STATUS_LABELS: Record<WaveStatus, string> = {
  open: 'Mo',
  picking: 'Dang lay',
  packing: 'Dang dong goi',
  completed: 'Hoan thanh',
  cancelled: 'Da huy',
};

export const WAVE_STATUS_COLORS: Record<WaveStatus, string> = {
  open: 'bg-slate-100 text-slate-700 border-slate-200',
  picking: 'bg-amber-100 text-amber-800 border-amber-200',
  packing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Tai san',
  liability: 'No phai tra',
  equity: 'Von chu so huu',
  revenue: 'Doanh thu',
  expense: 'Chi phi',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  asset: 'bg-blue-100 text-blue-800 border-blue-200',
  liability: 'bg-amber-100 text-amber-800 border-amber-200',
  equity: 'bg-violet-100 text-violet-800 border-violet-200',
  revenue: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  expense: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: 'Cho duyet',
  approved: 'Da duyet',
  rejected: 'Tu choi',
  received: 'Da nhan hang',
  quality_check: 'Kiem tra CL',
  refunded: 'Da hoan tien',
  closed: 'Da dong',
};

export const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  received: 'bg-violet-100 text-violet-800 border-violet-200',
  quality_check: 'bg-orange-100 text-orange-800 border-orange-200',
  refunded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: 'Mo',
  analyzed: 'Da phan tich',
  responded: 'Da phan hoi',
  closed: 'Da dong',
};

export const COMPLAINT_STATUS_COLORS: Record<ComplaintStatus, string> = {
  open: 'bg-amber-100 text-amber-800 border-amber-200',
  analyzed: 'bg-blue-100 text-blue-800 border-blue-200',
  responded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const SERIAL_STATUS_LABELS: Record<SerialStatus, string> = {
  in_stock: 'Trong kho',
  reserved: 'Da giu',
  sold: 'Da ban',
  returned: 'Da tra',
  defective: 'Loi',
};

export const SERIAL_STATUS_COLORS: Record<SerialStatus, string> = {
  in_stock: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  reserved: 'bg-amber-100 text-amber-800 border-amber-200',
  sold: 'bg-blue-100 text-blue-800 border-blue-200',
  returned: 'bg-violet-100 text-violet-800 border-violet-200',
  defective: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const INVENTORY_TXN_TYPE_LABELS: Record<InventoryTxnType, string> = {
  inbound: 'Nhap kho',
  outbound: 'Xuat kho',
  transfer_out: 'Chuyen ra',
  transfer_in: 'Chuyen vao',
  adjustment: 'Dieu chinh',
  reservation: 'Giu hang',
  release: 'Giai giu',
  scrap: 'Hu',
  return_in: 'Nhap tra',
};

export const INVENTORY_TXN_TYPE_COLORS: Record<InventoryTxnType, string> = {
  inbound: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  outbound: 'bg-rose-100 text-rose-800 border-rose-200',
  transfer_out: 'bg-amber-100 text-amber-800 border-amber-200',
  transfer_in: 'bg-blue-100 text-blue-800 border-blue-200',
  adjustment: 'bg-violet-100 text-violet-800 border-violet-200',
  reservation: 'bg-orange-100 text-orange-800 border-orange-200',
  release: 'bg-teal-100 text-teal-800 border-teal-200',
  scrap: 'bg-slate-100 text-slate-700 border-slate-200',
  return_in: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Cho duyet',
  maker_approved: 'Maker duyet',
  checker_approved: 'Checker duyet',
  rejected: 'Tu choi',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  maker_approved: 'bg-blue-100 text-blue-800 border-blue-200',
  checker_approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function maskPII(text: string): string {
  return text
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]')
    .replace(/\b\d{1,5}\s+\w+\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr)\b/gi, '[ADDRESS]');
}

export function truncateHash(hash: string, len = 12): string {
  if (!hash) return '—';
  return hash.length > len * 2 ? `${hash.slice(0, len)}...${hash.slice(-len)}` : hash;
}
