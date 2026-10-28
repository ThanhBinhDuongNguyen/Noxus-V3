// ============ Tenant / SaaS Types ============

export type TenantStatus = 'active' | 'suspended' | 'closed';
export type TenantRole = 'owner' | 'admin' | 'manager' | 'warehouse' | 'finance' | 'viewer';
export type MembershipStatus = 'active' | 'invited' | 'suspended';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
}

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: TenantRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface TenantSettings {
  tenant_id: string;
  timezone: string;
  currency: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============ Core Types (v2.0) ============

export type CustomerStatus = 'active' | 'inactive' | 'lead';
export type ProductStatus = 'active' | 'discontinued' | 'out_of_stock';
export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';
export type PaymentStatus = 'unpaid' | 'paid' | 'partially_paid' | 'refunded';
export type CustomerTier = 'standard' | 'silver' | 'gold' | 'platinum';

// ============ Enterprise Types (v3.0) ============

export type Channel = 'website' | 'shopee' | 'tiktok' | 'lazada' | 'manual';
export type SkuType = 'physical' | 'virtual_bundle';
export type WarehouseStatus = 'active' | 'inactive';
export type TransferStatus = 'requested' | 'in_transit' | 'received' | 'cancelled';
export type POStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
export type InventoryTxnType =
  | 'inbound'
  | 'outbound'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'reservation'
  | 'release'
  | 'scrap'
  | 'return_in';
export type SerialStatus = 'in_stock' | 'reserved' | 'sold' | 'returned' | 'defective';
export type WaveStatus = 'open' | 'picking' | 'packing' | 'completed' | 'cancelled';
export type AutomationTrigger = 'order_created' | 'order_status_changed' | 'payment_received';
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type ReturnType = 'customer_rma' | 'failed_delivery_rts';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'received' | 'quality_check' | 'refunded' | 'closed';
export type ApprovalStatus = 'pending' | 'maker_approved' | 'checker_approved' | 'rejected';
export type ComplaintStatus = 'open' | 'analyzed' | 'responded' | 'closed';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';
export type EvidenceStation = 'packing' | 'unboxing_return';

// ============ RBAC Types ============

export type UserRole = 'admin' | 'manager' | 'warehouse';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Interfaces ============

export interface Brand {
  id: string;
  name: string;
  tax_code: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseBin {
  id: string;
  warehouse_id: string;
  zone: string;
  aisle: string;
  rack: string;
  bin_code: string;
  picking_sequence: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  status: CustomerStatus;
  notes: string | null;
  phone_hash: string | null;
  masked_phone: string | null;
  total_spend: number;
  return_rate: number;
  loyalty_points: number;
  tier: CustomerTier;
  rfm_score: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
  status?: CustomerStatus;
  notes?: string | null;
  tier?: CustomerTier;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  cost: number;
  stock: number;
  reorder_level: number;
  status: ProductStatus;
  image_url: string | null;
  brand_id: string | null;
  sku_type: SkuType;
  allow_preorder: boolean;
  is_serialized: boolean;
  moving_avg_cost: number;
  weight_grams: number | null;
  dimensions_cm: string | null;
  safety_stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number;
  cost: number;
  stock: number;
  reorder_level?: number;
  status?: ProductStatus;
  image_url?: string | null;
  brand_id?: string | null;
  sku_type?: SkuType;
  allow_preorder?: boolean;
  is_serialized?: boolean;
  weight_grams?: number | null;
  dimensions_cm?: string | null;
  safety_stock?: number;
}

export interface BundleComponent {
  id: string;
  parent_bundle_product_id: string;
  child_product_id: string;
  quantity_ratio: number;
  created_at: string;
  child_product?: Product;
}

export interface ChannelSkuMapping {
  id: string;
  channel: Channel;
  channel_shop_id: string | null;
  channel_product_id: string | null;
  channel_sku_id: string;
  internal_product_id: string;
  created_at: string;
  internal_product?: Product;
}

export interface InventoryItem {
  id: string;
  warehouse_id: string;
  product_id: string;
  physical_qty: number;
  reserved_qty: number;
  available_qty: number;
  unavailable_qty: number;
  incoming_qty: number;
  safety_stock: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  product?: Product;
}

export interface InventoryBatch {
  id: string;
  warehouse_id: string;
  bin_id: string | null;
  product_id: string;
  batch_number: string;
  expiry_date: string | null;
  import_unit_cost: number;
  qty_on_hand: number;
  qty_reserved: number;
  created_at: string;
  warehouse?: Warehouse;
  product?: Product;
}

export interface InventorySerial {
  id: string;
  warehouse_id: string;
  batch_id: string | null;
  product_id: string;
  serial_number: string;
  status: SerialStatus;
  current_order_id: string | null;
  created_at: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface ChannelStockPool {
  id: string;
  product_id: string;
  channel: Channel;
  channel_shop_id: string | null;
  ring_fenced_qty: number;
  shared_pool_ratio: number;
  sales_velocity_per_hour: number;
  last_rebalanced_at: string | null;
  created_at: string;
  product?: Product;
}

export interface StockTransaction {
  id: string;
  warehouse_id: string;
  product_id: string;
  batch_id: string | null;
  type: InventoryTxnType;
  quantity_delta: number;
  balance_after: number;
  reference_id: string | null;
  reason: string | null;
  created_by: string;
  created_at: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  warehouse_id: string;
  supplier_name: string;
  lead_time_days: number;
  status: POStatus;
  expected_arrival_date: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  purchase_order_items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  received_qty: number;
  created_at: string;
  product?: Product;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: TransferStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  stock_transfer_items?: StockTransferItem[];
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method: string | null;
  shipping_address: string | null;
  notes: string | null;
  placed_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  channel: Channel;
  channel_order_sn: string | null;
  assigned_warehouse_id: string | null;
  estimated_margin: number | null;
  must_ship_by_sla: string | null;
  hold_reason: string | null;
  fulfillment_wave_id: string | null;
  customer?: Customer | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  parent_bundle_product_id: string | null;
  unit_cost_mac_snapshot: number;
  serial_numbers: string[] | null;
  is_free_gift: boolean;
}

export interface OrderStatusLog {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export interface OrderInput {
  customer_id: string;
  status?: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  payment_status?: PaymentStatus;
  payment_method?: string | null;
  shipping_address?: string | null;
  notes?: string | null;
  channel?: Channel;
  channel_order_sn?: string | null;
  assigned_warehouse_id?: string | null;
  must_ship_by_sla?: string | null;
}

export interface OrderItemInput {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_free_gift?: boolean;
}

export interface FulfillmentWave {
  id: string;
  warehouse_id: string;
  wave_code: string;
  status: WaveStatus;
  assigned_picker_id: string | null;
  order_count: number;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
}

export interface OrderAutomationRule {
  id: string;
  rule_name: string;
  priority: number;
  conditions_json: Record<string, unknown>;
  actions_json: Record<string, unknown>;
  is_active: boolean;
  trigger_event: AutomationTrigger;
  created_at: string;
  updated_at: string;
}

export interface OrderEvidenceMedia {
  id: string;
  order_id: string;
  station_type: EvidenceStation;
  video_s3_key: string;
  scale_weight_grams: number | null;
  recorded_by: string;
  recorded_at: string;
}

export interface LedgerAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  parent_account_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  event_source: string;
  reference_id: string | null;
  description: string | null;
  posted_at: string;
  created_at: string;
  journal_lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  created_at: string;
  account?: LedgerAccount;
}

export interface OrderFeeBreakdown {
  id: string;
  order_id: string;
  commission_fee: number;
  transaction_fee: number;
  voucher_co_fund_fee: number;
  estimated_shipping_fee: number;
  actual_shipping_fee: number;
  weight_penalty_fee: number;
  net_payout: number;
  is_reconciled: boolean;
  discrepancy_note: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
}

export interface ReturnRequest {
  id: string;
  return_number: string;
  order_id: string;
  return_type: ReturnType;
  status: ReturnStatus;
  refund_amount: number;
  reason: string | null;
  carrier_deadline_date: string | null;
  evidence_media_id: string | null;
  is_refund_without_return: boolean;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
  order?: Order;
}

export interface CustomerComplaint {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  raw_content: string | null;
  redacted_content: string | null;
  sentiment: Sentiment | null;
  urgency_score: number | null;
  issue_category: string | null;
  suggested_reply: string | null;
  analyzed_at: string | null;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_ref: string | null;
  payload_json: Record<string, unknown> | null;
  prev_hash: string | null;
  current_hash: string;
  created_at: string;
}

export interface OutboundWebhook {
  id: string;
  name: string;
  target_url: string;
  event_types: string[];
  secret: string;
  is_active: boolean;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  status_code: number | null;
  response_body: string | null;
  attempt_number: number;
  delivered_at: string;
  webhook?: OutboundWebhook;
}

export interface MarginConfig {
  id: string;
  min_margin_percent: number;
  max_loss_per_order: number;
  circuit_breaker_enabled: boolean;
  auto_zero_stock_on_trigger: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelConnection {
  id: string;
  channel: Channel;
  shop_name: string;
  shop_id: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync_at: string | null;
  api_key_masked: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  channel: Channel;
  shop_name: string;
  sync_type: string;
  status: 'success' | 'failed' | 'retrying';
  message: string | null;
  retry_count: number;
  synced_at: string;
}

export interface BufferRule {
  id: string;
  warehouse_id: string;
  product_id: string;
  safety_stock: number;
  reorder_point: number;
  push_ratio_percent: number;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  product?: Product;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  channel: Channel | null;
  preferred_warehouse_id: string | null;
  strategy: 'nearest' | 'priority' | 'most_stock';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
}
