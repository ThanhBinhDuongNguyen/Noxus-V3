import { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Boxes,
  Warehouse,
  Truck,
  Banknote,
  Receipt,
  TrendingUp,
  Bot,
  PackageCheck,
  ArrowLeftRight,
  ClipboardList,
  Link2,
  Layers,
  RefreshCw,
  Zap,
  Webhook,
  ShieldCheck,
  Activity,
  Gauge,
  BadgePercent,
  FlaskConical,
  ScrollText,
  Settings,
  ArrowDown,
  Users,
  LayoutDashboard,
  ShieldAlert,
  CircuitBoard,
  Rocket,
  Calendar,
  CheckCircle2,
  Circle,
  Lock,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type PhaseId = 'day1' | 'day2' | 'week1' | 'daily' | 'weekly' | 'advanced';

interface Phase {
  id: PhaseId;
  label: string;
  sublabel: string;
  icon: typeof Rocket;
  color: string;
  description: string;
  role: string;
  loginAs: string;
  steps: OnboardStep[];
}

interface OnboardStep {
  num: number;
  page: string;
  icon: typeof ShoppingCart;
  title: string;
  what: string;
  why: string;
  tips: string;
}

const PHASES: Phase[] = [
  {
    id: 'day1',
    label: 'Ngay 1',
    sublabel: 'Khoi tao he thong',
    icon: Rocket,
    color: 'brand',
    description: 'Dang nhap lan dau, tao kho, them san pham, nhap ton kho dau ky',
    role: 'Quan tri vien',
    loginAs: 'admin@nexusoms.vn / Admin@123',
    steps: [
      {
        num: 1, page: 'Dang nhap', icon: LayoutDashboard,
        title: 'Dang nhap bang tai khoan admin',
        what: 'Mo trang dang nhap, nhap admin@nexusoms.vn / Admin@123. Sau khi dang nhap ban thay Dashboard tong quan.',
        why: 'Day la tai khoan co quyen cao nhat. Chi admin moi tao kho, them nguoi dung, cau hinh webhook.',
        tips: 'Trang dang nhap hien 3 tai khoan demo. Admin thay tat ca 28 trang, manager thay 22, warehouse thay 10.',
      },
      {
        num: 2, page: 'Kho & Vi tri', icon: Warehouse,
        title: 'Tao cac kho cua ban',
        what: 'Vao Kho & Vi tri > nhan "Them kho". Nhap ma kho (VD: WH-HN), ten kho, dia chi, do uu tien. Tao it nhat 1 kho de bat dau.',
        why: 'Moi don hang can gan vao 1 kho de xu ly. Ton kho dem theo tung kho rieng. Mac dinh da co 3 kho: HN, HCM, DN.',
        tips: 'Do uu tien (1, 2, 3...) quyet dinh kho nao duoc chon truoc khi dinh tuyen don. Kho P1 duoc uu tien nhat.',
      },
      {
        num: 3, page: 'San pham & BOM', icon: Package,
        title: 'Them danh muc san pham',
        what: 'Vao San pham > "Them san pham". Nhap SKU, ten, mo ta, danh muc, gia ban, gia von, ton kho ban dau. An Luu.',
        why: 'Khong co san pham thi khong the tao don hang. Gia von (cost) can thiet de tinh margin. SKU la ma duy nhat khong trung.',
        tips: 'Neu ban co san pham combo (VD: 3 ao thun), tao san pham cha roi them thanh phan (bundle). Mac dinh da co 10 SP mau.',
      },
      {
        num: 4, page: 'Ton kho 5 trang thai', icon: Boxes,
        title: 'Kiem tra ton kho dau ky',
        what: 'Vao Ton kho 5 trang thai. He thong tu dong tao ban ghi ton kho khi ban them san pham. 5 trang thai: Physical, Reserved, Available, Unavailable, Incoming.',
        why: 'Available = Physical - Reserved. Khi tao don, he thong tu Reserved them so luong. Khi giao hang, Physical giam.',
        tips: 'Badge do tren sidebar hien khi ton kho <= reorder level. Mac dinh da co ton kho cho 3 kho x 10 san pham.',
      },
      {
        num: 5, page: 'Khach hang', icon: Users,
        title: 'Them danh sach khach hang',
        what: 'Vao Khach hang > "Them khach hang". Nhap ten, email, dien thoai, dia chi giao hang, cong ty (neu co).',
        why: 'Can co khach hang truoc khi tao don. He thong tu dong tinh tong chi tieu, ti le doi tra, xep hang VIP/Thuong.',
        tips: 'Khach VIP co ti le mua cao, duoc uu tien. He thong tu dong de xuat lenh bo hang khi khach mua nhieu. Da co 8 khach mau.',
      },
    ],
  },
  {
    id: 'day2',
    label: 'Ngay 2',
    sublabel: 'Ban don dau tien',
    icon: ShoppingCart,
    color: 'brand',
    description: 'Tao don hang dau tien, gan kho, xuat wave picking, cap nhat trang thai giao hang',
    role: 'Admin hoac Quan ly',
    loginAs: 'admin@nexusoms.vn hoac manager@nexusoms.vn',
    steps: [
      {
        num: 1, page: 'Don hang', icon: ShoppingCart,
        title: 'Tao don hang dau tien',
        what: 'Vao Don hang > "Tao don". Chon khach hang, chon san pham, nhap so luong. He thong tu tinh subtotal, VAT 10%, phi ship. Chon kho giao, chon kenh (manual/shopee/tiktok). An Luu.',
        why: 'Khi luu don, he thong tu dong: (1) tru ton kho Reserved, (2) tao log trang thai "pending", (3) gan ma don DH-XXXX.',
        tips: 'Don COD mac dinh payment_status = unpaid. Don bank_transfer/momo mac dinh = paid. SLA = 3 ngay ke tu khi tao.',
      },
      {
        num: 2, page: 'Wave Picking & SLA', icon: Truck,
        title: 'Tao wave picking va gan don',
        what: 'Vao Wave Picking > "Tao wave". Chon kho, chon nhieu don can gom. Wave chuyen qua 4 trang thai: Mo > Dang nhat > Dang dong goi > Hoan thanh.',
        why: 'Wave gom nhieu don thanh 1 lan nhat hang de tiet kiem thoi gian di lai trong kho. SLA countdown dem nguoc cho moi don.',
        tips: 'Nhan vao wave de xem danh sach don. Khi chuyen sang "Dang dong goi", don tu chuyen sang "processing". Mac dinh da co WAVE-001.',
      },
      {
        num: 3, page: 'Don hang', icon: ShoppingCart,
        title: 'Cap nhat trang thai don',
        what: 'Quay lai Don hang, nhan vao 1 don. Trong drawer chi tiet, cap nhat trang thai: pending > processing > shipped > delivered. Moi lan doi trang thai, log tu ghi lai.',
        why: 'Trang thai shipped danh dau don da giao cho don vi van chuyen. Delivered danh dau khach da nhan. Cancelled = huy, tra lai ton kho.',
        tips: 'Moi buoc chuyen trang thai ghi vao order_status_log. Ban co the xem lich su trong drawer chi tiet don hang.',
      },
      {
        num: 4, page: 'So kep', icon: Banknote,
        title: 'Kiem tra but toan tu dong',
        what: 'Vao So kep. Khi don hang chuyen sang "delivered", he thong tu tao but toan: No Phai thu khach / Co Doanh thu ban hang. Moi but toan Debit = Credit.',
        why: 'Sach kep la bat buoc de bao cao tai chinh chinh xac. 10 tai khoan da cau hinh: Tien mat, Phai thu, Hang ton, Phai tra, Von, Doanh thu, Gia von, Phi van chuyen...',
        tips: 'Mac dinh da co 2 but toan mau (JE-0001, JE-0002) cho don DH-0001. Moi but toan co nhieu dong, moi dong gan voi 1 tai khoan.',
      },
    ],
  },
  {
    id: 'week1',
    label: 'Tuan 1',
    sublabel: 'Ket noi da kenh',
    icon: Link2,
    color: 'sky',
    description: 'Ket noi shop Shopee/TikTok, anh xa SKU, cau hinh dinh tuyen kho, dong bo ton kho',
    role: 'Quan ly',
    loginAs: 'manager@nexusoms.vn / Manager@123',
    steps: [
      {
        num: 1, page: 'Ket noi kenh', icon: Link2,
        title: 'Ket noi shop TMĐT',
        what: 'Vao Ket noi kenh > "Them ket noi". Chon kenh (shopee/tiktok/lazada), nhap ten shop, shop ID, API key. He thong kiem tra ket noi va hien trang thai connected/error.',
        why: 'Khi ket noi thanh cong, don hang tu shop tu dong dong ve he thong. Ton kho tu dong day len shop khi co thay doi.',
        tips: 'Mac dinh da co 3 shop: Shopee (connected), TikTok (connected), Lazada (error - token het han). Click vao shop de xem chi tiet sync.',
      },
      {
        num: 2, page: 'Anh xa SKU kenh', icon: Layers,
        title: 'Anh xa SKU noi bo sang SKU kenh',
        what: 'Vao Anh xa SKU > "Them anh xa". Chon kenh, nhap SKU tren kenh (VD: SHOPEE-AO-001), chon san pham noi bo (SP-AO-001). Luu.',
        why: 'Khi don tu Shopei ve voi SKU SHOPEE-AO-001, he thong tu map sang SP-AO-001 de tru ton kho dung. Khong anh xa = don khong gan duoc san pham.',
        tips: 'Mac dinh da co 5 anh xa. 1 san pham co the anh xa nhieu kenh. Anh xa la dieu kien bat buoc truoc khi dong bo ton kho.',
      },
      {
        num: 3, page: 'Dinh tuyen kho', icon: Activity,
        title: 'Cau hinh luat dinh tuyen don',
        what: 'Vao Dinh tuyen kho > "Them quy tac". Chon kenh (VD: shopee), chon kho uu tien (VD: WH-HCM), chon strategy (priority/nearest/most_stock). Set do uu tien.',
        why: 'Khi don tu kenh ve, he thong tu gan kho theo routing rule. VD: don Shopee -> WH-HCM. Khong co rule -> gan kho theo do uu tien kho.',
        tips: 'Strategy nearest = chon kho gan khach nhat. most_stock = chon kho co nhieu ton nhat. priority = chon kho cu the. Da co 5 routing rule mau.',
      },
      {
        num: 4, page: 'Giam sat dong bo', icon: RefreshCw,
        title: 'Giam sat dong bo ton kho',
        what: 'Vao Giam sat dong bo. Moi 15 phut he thong tu dong day ton kho len tat ca shop. Log hien trang thai: success / failed / retrying.',
        why: 'Neu ton kho tren shop khong dong bo, ban se bi ban ao (ban ma kho khong con) hoac mat don (khong ban du kho con). Log retry cho biet co can canh bao khong.',
        tips: 'Mac dinh da co 5 sync log. Lazada dang loi token - can lam moi API key. Click vao log de xem chi tiet retry count va message.',
      },
    ],
  },
  {
    id: 'daily',
    label: 'Hang ngay',
    sublabel: 'Van hanh moi ngay',
    icon: Calendar,
    color: 'emerald',
    description: 'Cong viec lap lai moi ngay: xu ly don, giao hang, nhap kho, doi tra',
    role: 'Tat ca vai tro',
    loginAs: 'warehouse@nexusoms.vn (kho) / manager (van hanh)',
    steps: [
      {
        num: 1, page: 'Dashboard', icon: LayoutDashboard,
        title: 'Sang: Mo Dashboard kiem tra tinh hinh',
        what: 'Vao Dashboard. Xem: so don pending/processing, don qua SLA, ton kho thap, doanh thu hom nay, margin trung binh.',
        why: 'Dashboard la diem bat dau moi ngay. Badge do tren sidebar cho biet co bao nhieu don cho xu ly va bao nhieu SP sap het hang.',
        tips: 'Click vao moi card de di nhanh den trang tuong ung. Dashboard cap nhat moi 30 giay.',
      },
      {
        num: 2, page: 'Don hang', icon: ShoppingCart,
        title: 'Sang: Xu ly don moi',
        what: 'Vao Don hang. Loc theo status = pending. Mo tung don, kiem tra thong tin, chuyen sang processing. Tao wave picking cho nhom don cung kho.',
        why: 'Don pending can duoc chuyen sang processing trong ngay. Don qua SLA (must_ship_by_sla) se bi canh bao do.',
        tips: 'Nhan "Tao don" o goc tren ben phai. Don COD can xac nhan thanh toan khi giao. Don bank_transfer/momo da thanh toan truoc.',
      },
      {
        num: 3, page: 'Wave Picking & SLA', icon: Truck,
        title: 'Sang-Chieu: Nhat hang va dong goi',
        what: 'Vao Wave Picking. Wave dang "picking" -> nhan vat nhat xong -> chuyen sang "packing" -> dong goi xong -> "completed". Don tu chuyen sang shipped.',
        why: 'Wave gom don de nhat 1 lan cho nhieu don. Nhan vien kho chi can lam theo danh sach trong wave, khong can di lai nhieu lan.',
        tips: 'SLA countdown hien ngay tren moi don trong wave. Don chua ship qua SLA hien do. Co the scan barcode de pack.',
      },
      {
        num: 4, page: 'Don hang', icon: ShoppingCart,
        title: 'Chieu: Danh dau giao thanh cong',
        what: 'Vao Don hang. Don "shipped" -> khi don vi van chuyen xac nhan da giao -> chuyen sang "delivered". He thong tu tao but toan doanh thu.',
        why: 'Delivered la buoc cuoi cua 1 don happy case. Sau delivered, doanh thu duoc ghi nhan vao so kep, margin duoc tinh.',
        tips: 'Neu khach tu choi nhan -> chuyen sang "cancelled" + payment_status = refunded. Ton kho tu tra lai.',
      },
      {
        num: 5, page: 'Ton kho 5 trang thai', icon: Boxes,
        title: 'Chieu: Kiem tra canh bao ton kho',
        what: 'Vao Ton kho. Kiem tra SP nao co Available <= reorder_point. SP do can duoc nhap them. Chuyen sang Don mua hang de tao PO.',
        why: 'Ban het hang = mat don. He thong tu canh bao khi ton kho den muc reorder. Buffer rule cho phep dat safety stock rieng tung SP/kho.',
        tips: 'Badge do tren sidebar dem so SP dang canh bao. Vao Ton kho an toan de xem/cap nhat safety stock va reorder point.',
      },
      {
        num: 6, page: 'Doi tra / RMA', icon: PackageCheck,
        title: 'Khi co: Xu ly doi tra',
        what: 'Vao Doi tra / RMA > "Tao yeu cau". Chon don goc, nhap ly do, so tien hoan. RMA chuyen: pending > approved > received > quality_check > refunded > closed.',
        why: 'Khi khach doi tra, can tao RMA de theo doi. Hang tra nhap lai kho (Physical tang). Hoan tien ghi am doanh thu trong so kep.',
        tips: 'RMA-0001 (refunded) va RMA-0002 (quality_check) da co san. Nhan vao RMA de xem lich su trang thai.',
      },
    ],
  },
  {
    id: 'weekly',
    label: 'Hang tuan',
    sublabel: 'Tai chinh & Bao cao',
    icon: Banknote,
    color: 'amber',
    description: 'Cuoi tuan: doi soát phi kenh, bao cao doanh thu, kiem tra margin, phan tich van toc ban',
    role: 'Quan ly hoac Admin',
    loginAs: 'manager@nexusoms.vn / Manager@123',
    steps: [
      {
        num: 1, page: 'Doi soát phi', icon: Receipt,
        title: 'Doi soát phi TMĐT',
        what: 'Vao Doi soát phi. Xem tung don kenh: phi hoa hong, phi giao hang, phi voucher. So sanh phi uoc tinh vs phi thuc te. Danh dau da doi soát.',
        why: 'Shopee/TikTok tru phi truc tiep. Neu khong doi soát, ban khong biet chenh lech phi. 3 don mau da co fee breakdown, 1 don co chenh lech 5.000 VND.',
        tips: 'Don co "discrepancy_note" can kiem tra thu cong. Click "Da doi soát" de danh dau da xong.',
      },
      {
        num: 2, page: 'Bao cao doanh thu', icon: TrendingUp,
        title: 'Xem bao cao doanh thu',
        what: 'Vao Bao cao doanh thu. Bieu do doanh thu theo ngay/thang/nam. Phan tich theo danh muc, theo kenh, theo kho. Co the xuat Excel/PDF.',
        why: 'Cuoi tuan can bao cao cho sep. Bao cao hien doanh thu, loi nhuan, margin theo nhieu chieu. Tu dong tinh tu du lieu don hang.',
        tips: 'Click vao bieu do de xem chi tiet. Su dung filter theo ngay de xem 1 tuan/thang cu the.',
      },
      {
        num: 3, page: 'Marg Circuit Breaker', icon: BadgePercent,
        title: 'Kiem tra margin',
        what: 'Vao Marg Circuit Breaker. Xem don nao co margin am. He thong tu HOLD don margin am va canh bao. Cau hinh nguong that loi toi da.',
        why: 'Ban don margin am = mat tien. Circuit breaker tu dong ngat ban khi vuot nguong. Tu dong khoa ton kho khi SP co margin am lien tuc.',
        tips: 'Set min_margin_percent va max_loss_per_order. Khi trigger, don tu dong hold_reason = "negative_margin".',
      },
      {
        num: 4, page: 'Van toc ban', icon: Gauge,
        title: 'Phan tich van toc ban',
        what: 'Vao Van toc ban. Xem doanh thu/gio, ton kho chay/ton. SP nao ban nhanh nhhat, SP nao cham nhat. De xuat bo hang dua van toc.',
        why: 'Van toc ban giup quyet dinh nhap them SP nao, ngung SP nao. SP ban cham chiem kho = ton von. SP ban nhanh can nhap them de khong het hang.',
        tips: 'Combobox SP = combo 3 ao thun dang ban tot. Tui tote (SP-TG-001) co ton kho 300 nhung ban cham.',
      },
      {
        num: 5, page: 'Don mua hang', icon: ClipboardList,
        title: 'Tao don mua hang (PO) nhap them',
        what: 'Vao Don mua hang > "Tao PO". Chon kho, nha cung cap, san pham, so luong, ngay du kien nhan. PO chuyen: draft > ordered > partial > received.',
        why: 'Khi PO nhan hang, ton kho Physical tang, Incoming giam. He thong ghi giao dich vao So giao dich ton. 2 PO mau da co: PO-0001 (ordered), PO-0002 (partial).',
        tips: 'PO partial = da nhan 1 phan. Click vao PO de xem items va cap nhat received_qty.',
      },
    ],
  },
  {
    id: 'advanced',
    label: 'Nang cao',
    sublabel: 'Tu dong hoa & Quan tri',
    icon: Zap,
    color: 'violet',
    description: 'Luat IF-THEN, webhook, audit trail, chaos test, tao nguoi dung',
    role: 'Quan tri vien',
    loginAs: 'admin@nexusoms.vn / Admin@123',
    steps: [
      {
        num: 1, page: 'Luat tu dong', icon: Zap,
        title: 'Tao luat tu dong IF-THEN',
        what: 'Vao Luat tu dong > "Tao luat". Nhap ten luat, dieu kien (IF), hanh dong (THEN), trigger event. VD: IF order_total >= 500K THEN add_free_gift.',
        why: 'Luat tu dong giam cong viec thu cong. Khi dieu kien IF match, action THEN tu chay khong can nguoi can thiep. 3 luat mau da co.',
        tips: 'Priority nho = chay truoc. Trigger: order_created, status_changed, payment_received. Co the tao nhieu luat cho 1 trigger.',
      },
      {
        num: 2, page: 'Outbound Webhooks', icon: Webhook,
        title: 'Cau hinh webhook gui ra ngoai',
        what: 'Vao Outbound Webhooks > "Them webhook". Nhap ten, target URL, event types, secret. He thong gui HTTP POST + HMAC khi co event.',
        why: 'Webhook dong bo he thong NexusOMS voi ERP ke toan, CRM, Slack. VD: khi don delivered -> gui sang ERP de ghi nhan doanh thu. 3 webhook mau da co.',
        tips: 'Max retries = so lan gui lai khi loi. HMAC signature dung de xac thuc webhook khong bi gia mao.',
      },
      {
        num: 3, page: 'Cai dat & Phan quyen', icon: Settings,
        title: 'Tao nguoi dung va gan vai tro',
        what: 'Vao Cai dat > tab Phan quyen > "Them nguoi dung". Nhap email, mat khau, ho ten, chon vai tro (admin/manager/warehouse). Luu.',
        why: 'Moi nguoi dung thay trang khac nhau. Admin thay tat ca, manager khong thay audit/webhook/simulator, warehouse chi thay don hang + ton kho.',
        tips: 'Co the doi vai tro va kich hoat/vo hieu hoa nguoi dung bat ky luc nao. 3 tai khoan mau: admin, manager, warehouse.',
      },
      {
        num: 4, page: 'Nhat ky Audit', icon: ShieldCheck,
        title: 'Kiem tra nhat ky audit',
        what: 'Vao Nhat ky Audit. Xem lich su moi thay doi quan trong: tao don, doi trang thai, xoa du lieu, doi gia. Moi entry co hash SHA-256 lien ket.',
        why: 'Audit trail chong xoa/sua im lang. Neu ai do sua du lieu, hash se khong khop. Day la bat buoc de bao cao kiem toan.',
        tips: 'Hash lien ket: entry sau chua hash cua entry truoc. Sua 1 entry = pha ca chuoi. Filter theo actor, action, entity.',
      },
      {
        num: 5, page: 'Chaos Simulator', icon: FlaskConical,
        title: 'Test do ben he thong',
        what: 'Vao Chaos Simulator. Chay cac scenario: Flash Sale Surge (20 don cung luc), Duplicate Webhook, Margin Attack, Tamper Audit, Concurrent Inventory.',
        why: 'Truoc khi len production, can test he thong co chiu duoc tac dong cao khong. Simulator tao data test va xem he thong phan hoi ra sao.',
        tips: 'Flash Sale Surge tao 20 don SIM-FLASH de test inventory reservation. Tamper Audit DB phat hien chuoi hash bi gãy.',
      },
    ],
  },
];

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string; stepBg: string; stepBorder: string; line: string; activeBg: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', stepBg: 'bg-brand-100', stepBorder: 'border-brand-300', line: 'bg-brand-300', activeBg: 'bg-brand-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', stepBg: 'bg-sky-100', stepBorder: 'border-sky-300', line: 'bg-sky-300', activeBg: 'bg-sky-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', stepBg: 'bg-amber-100', stepBorder: 'border-amber-300', line: 'bg-amber-300', activeBg: 'bg-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', stepBg: 'bg-emerald-100', stepBorder: 'border-emerald-300', line: 'bg-emerald-300', activeBg: 'bg-emerald-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', stepBg: 'bg-violet-100', stepBorder: 'border-violet-300', line: 'bg-violet-300', activeBg: 'bg-violet-600' },
};

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-rose-100', text: 'text-rose-700' },
  manager: { bg: 'bg-sky-100', text: 'text-sky-700' },
  warehouse: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

function getRoleBadge(role: string): { bg: string; text: string } {
  if (role.toLowerCase().includes('admin')) return ROLE_BADGE.admin;
  if (role.toLowerCase().includes('manager')) return ROLE_BADGE.manager;
  if (role.toLowerCase().includes('warehouse')) return ROLE_BADGE.warehouse;
  return { bg: 'bg-ink-100', text: 'text-ink-600' };
}

export function FlowGuidePage() {
  const [activePhase, setActivePhase] = useState<PhaseId>('day1');
  const phase = PHASES.find((p) => p.id === activePhase)!;
  const colors = PHASE_COLORS[phase.color];
  const roleBadge = getRoleBadge(phase.role);

  const currentIndex = PHASES.findIndex((p) => p.id === activePhase);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === PHASES.length - 1;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-900/30">
          <Rocket size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-ink-900 tracking-tight">Huong dan onboard — Moi mua he thong</h2>
          <p className="text-sm text-ink-500 mt-0.5">Lam theo tung giai doan tu Ngay 1 den khi van hanh day du</p>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="card p-4">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
          {PHASES.map((p, i) => {
            const Icon = p.icon;
            const isActive = activePhase === p.id;
            const isDone = i < currentIndex;
            const c = PHASE_COLORS[p.color];

            return (
              <div key={p.id} className="flex items-center shrink-0">
                <button
                  onClick={() => setActivePhase(p.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 sm:px-4 py-2.5 transition-all duration-200 border-2',
                    isActive
                      ? `${c.bg} ${c.border} shadow-sm`
                      : isDone
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-ink-50 border-ink-100 hover:border-ink-200'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isActive ? c.stepBg : isDone ? 'bg-emerald-100' : 'bg-white'
                  )}>
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <Icon size={16} className={isActive ? c.text : 'text-ink-400'} />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className={cn('text-xs font-bold', isActive ? c.text : isDone ? 'text-emerald-700' : 'text-ink-500')}>
                      {p.label}
                    </p>
                    <p className="text-[10px] text-ink-400">{p.sublabel}</p>
                  </div>
                </button>
                {!isLast && i < PHASES.length - 1 && (
                  <div className={cn('h-0.5 w-3 sm:w-6 shrink-0', isDone ? 'bg-emerald-300' : 'bg-ink-200')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase detail */}
      <div className="card p-6 lg:p-8">
        {/* Phase header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colors.stepBg)}>
              {(() => {
                const Icon = phase.icon;
                return <Icon size={24} className={colors.text} />;
              })()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-ink-900">{phase.label}: {phase.sublabel}</h3>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full', roleBadge.bg, roleBadge.text)}>
                  {phase.role}
                </span>
              </div>
              <p className="text-sm text-ink-500 mt-0.5">{phase.description}</p>
            </div>
          </div>
          <div className="rounded-lg bg-ink-50 border border-ink-200 px-4 py-2.5">
            <p className="text-[10px] text-ink-400 font-medium uppercase tracking-wider mb-0.5">Dang nhap bang</p>
            <code className="text-xs text-ink-700 font-mono">{phase.loginAs}</code>
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          {phase.steps.map((s, i) => {
            const Icon = s.icon;
            const isLastStep = i === phase.steps.length - 1;
            return (
              <div key={i} className="flex gap-4 relative">
                {/* Step number + line */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all',
                    colors.stepBg, colors.stepBorder, colors.text
                  )}>
                    {s.num}
                  </div>
                  {!isLastStep && (
                    <div className={cn('w-0.5 flex-1 my-1 min-h-[2rem]', colors.line)} />
                  )}
                </div>

                {/* Step content */}
                <div className={cn('flex-1 pb-6 rounded-xl border p-5 mb-2', colors.border, colors.bg)}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/90')}>
                      <Icon size={18} className={colors.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-ink-900 text-sm">{s.title}</h4>
                        <span className={cn('text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90', colors.text)}>
                          {s.page}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 ml-12">
                    {/* What */}
                    <div className="flex items-start gap-2">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0', colors.text)}>Lam gi:</span>
                      <p className="text-sm text-ink-700 leading-relaxed">{s.what}</p>
                    </div>
                    {/* Why */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 text-ink-400">Tai sao:</span>
                      <p className="text-sm text-ink-600 leading-relaxed">{s.why}</p>
                    </div>
                    {/* Tips */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 text-amber-600">Mẹo:</span>
                      <p className="text-sm text-ink-500 leading-relaxed">{s.tips}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
          <button
            onClick={() => !isFirst && setActivePhase(PHASES[currentIndex - 1].id)}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              isFirst
                ? 'bg-ink-50 text-ink-300 cursor-not-allowed'
                : 'bg-white border border-ink-200 text-ink-700 hover:border-ink-300 hover:shadow-sm'
            )}
          >
            <ArrowDown size={14} className="rotate-90" />
            {isFirst ? 'Bat dau' : PHASES[currentIndex - 1].label}
          </button>

          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === currentIndex ? cn('w-6', colors.activeBg) : i < currentIndex ? 'bg-emerald-400' : 'bg-ink-200'
                )}
              />
            ))}
          </div>

          <button
            onClick={() => !isLast && setActivePhase(PHASES[currentIndex + 1].id)}
            disabled={isLast}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              isLast
                ? 'bg-ink-50 text-ink-300 cursor-not-allowed'
                : cn('text-white shadow-sm hover:shadow-md', colors.activeBg)
            )}
          >
            {isLast ? 'Hoan thanh' : PHASES[currentIndex + 1].label}
            <ArrowDown size={14} className="-rotate-90" />
          </button>
        </div>
      </div>

      {/* Quick reference: roles overview */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink-900 mb-1">3 tai khoan demo — Dung de train</h3>
        <p className="text-sm text-ink-500 mb-4">Dang nhap bang tung tai khoan de thay giao dien khac nhau theo quyen</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-rose-600" />
              <h4 className="font-semibold text-rose-800 text-sm">Quan tri vien</h4>
            </div>
            <code className="text-xs bg-white/80 text-rose-600 px-2 py-1 rounded font-mono block mb-3">admin@nexusoms.vn / Admin@123</code>
            <div className="space-y-1.5 text-xs text-rose-600">
              <div className="flex items-center gap-2"><LayoutDashboard size={13} /> Dashboard, Don hang, Khach hang</div>
              <div className="flex items-center gap-2"><Package size={13} /> San pham, Ton kho, Chuyen kho, Kho</div>
              <div className="flex items-center gap-2"><Banknote size={13} /> Tai chinh, So kep, Bao cao</div>
              <div className="flex items-center gap-2"><Settings size={13} /> Phan quyen, Audit, Webhook, Simulator</div>
            </div>
            <p className="text-[10px] text-rose-400 mt-2 font-medium">Thay tat ca 28 trang</p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={18} className="text-sky-600" />
              <h4 className="font-semibold text-sky-800 text-sm">Quan ly</h4>
            </div>
            <code className="text-xs bg-white/80 text-sky-600 px-2 py-1 rounded font-mono block mb-3">manager@nexusoms.vn / Manager@123</code>
            <div className="space-y-1.5 text-xs text-sky-600">
              <div className="flex items-center gap-2"><LayoutDashboard size={13} /> Dashboard, Don hang, Khach hang</div>
              <div className="flex items-center gap-2"><Package size={13} /> San pham, Ton kho, Chuyen kho, Kho</div>
              <div className="flex items-center gap-2"><Banknote size={13} /> Tai chinh, So kep, Bao cao</div>
              <div className="flex items-center gap-2"><Zap size={13} /> Luat tu dong, Da kenh, Giao hang</div>
            </div>
            <p className="text-[10px] text-sky-400 mt-2 font-medium">Thay 22 trang (khong thay audit/webhook/simulator/phan quyen)</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Boxes size={18} className="text-emerald-600" />
              <h4 className="font-semibold text-emerald-800 text-sm">Nhan vien kho</h4>
            </div>
            <code className="text-xs bg-white/80 text-emerald-600 px-2 py-1 rounded font-mono block mb-3">warehouse@nexusoms.vn / Warehouse@123</code>
            <div className="space-y-1.5 text-xs text-emerald-600">
              <div className="flex items-center gap-2"><LayoutDashboard size={13} /> Dashboard</div>
              <div className="flex items-center gap-2"><ShoppingCart size={13} /> Don hang</div>
              <div className="flex items-center gap-2"><Boxes size={13} /> Ton kho, Chuyen kho, Lo & Serial</div>
              <div className="flex items-center gap-2"><Truck size={13} /> Wave Picking & SLA</div>
              <div className="flex items-center gap-2"><PackageCheck size={13} /> Doi tra / RMA</div>
            </div>
            <p className="text-[10px] text-emerald-400 mt-2 font-medium">Thay 10 trang (khong thay tai chinh/quan tri/san pham)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
