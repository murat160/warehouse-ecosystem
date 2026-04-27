/**
 * ПОЛНАЯ модель данных склада уровня WMS.
 * Описано всё из ТЗ: роли, зоны, ячейки, SPU/SKU, ASN, задачи, заказы, возвраты, инциденты.
 */

// ═══════════════════════════════════════════════════════════
// 1. РОЛИ СОТРУДНИКОВ (полный список из ТЗ)
// ═══════════════════════════════════════════════════════════

export type WorkerRole =
  | 'receiver' | 'qc_inspector' | 'putaway' | 'picker' | 'packer' | 'sorter'
  | 'shipper' | 'returns' | 'repack' | 'inventory_controller' | 'replenishment'
  | 'forklift' | 'maintenance' | 'security'
  | 'shift_supervisor' | 'inbound_lead' | 'outbound_lead' | 'inventory_lead'
  | 'returns_lead' | 'quality_manager' | 'warehouse_manager' | 'super_admin';

export const ROLE_LABELS: Record<WorkerRole, string> = {
  receiver: 'Приёмщик',
  qc_inspector: 'Контроль качества',
  putaway: 'Размещение',
  picker: 'Сборщик',
  packer: 'Упаковщик',
  sorter: 'Сортировщик',
  shipper: 'Отправка',
  returns: 'Возвраты',
  repack: 'Переупаковка',
  inventory_controller: 'Инвентаризатор',
  replenishment: 'Пополнение',
  forklift: 'Водитель погрузчика',
  maintenance: 'Тех. обслуживание',
  security: 'Охрана',
  shift_supervisor: 'Старший смены',
  inbound_lead: 'Руководитель приёмки',
  outbound_lead: 'Руководитель отгрузки',
  inventory_lead: 'Руководитель остатков',
  returns_lead: 'Руководитель возвратов',
  quality_manager: 'Менеджер качества',
  warehouse_manager: 'Менеджер склада',
  super_admin: 'Супер-админ',
};

export const isManagerRole = (r: WorkerRole) =>
  ['shift_supervisor','inbound_lead','outbound_lead','inventory_lead','returns_lead','quality_manager','warehouse_manager','super_admin'].includes(r);

// ═══════════════════════════════════════════════════════════
// 2. ЗОНЫ СКЛАДА
// ═══════════════════════════════════════════════════════════

export type ZoneCode =
  | 'INB' | 'QC' | 'REP' | 'HNG' | 'FLD' | 'SHS' | 'ACC' | 'HVL'
  | 'RTV' | 'DAM' | 'QRT' | 'PIC' | 'BULK' | 'PCK' | 'SRT' | 'OUT' | 'RET';

export interface Zone {
  code: ZoneCode;
  name: string;
  description: string;
  color: string;
  utilization: number;
  blocked: boolean;
}

export const ZONES: Zone[] = [
  { code: 'INB',  name: 'Приёмка',          description: 'Входящие поставки',  color: '#2EA7E0', utilization: 45, blocked: false },
  { code: 'QC',   name: 'Контроль',         description: 'Проверка качества',  color: '#F59E0B', utilization: 30, blocked: false },
  { code: 'REP',  name: 'Переупаковка',     description: 'Repack',             color: '#A855F7', utilization: 15, blocked: false },
  { code: 'HNG',  name: 'Вешалки',          description: 'Одежда на плечиках', color: '#EC4899', utilization: 72, blocked: false },
  { code: 'FLD',  name: 'Сложенная одежда', description: 'Folded',             color: '#06B6D4', utilization: 84, blocked: false },
  { code: 'SHS',  name: 'Обувь',            description: 'Shoes',              color: '#84CC16', utilization: 65, blocked: false },
  { code: 'ACC',  name: 'Аксессуары',       description: 'Сумки, ремни',       color: '#F97316', utilization: 38, blocked: false },
  { code: 'HVL',  name: 'Высокая ценность', description: 'Дорогие бренды',     color: '#7C3AED', utilization: 55, blocked: false },
  { code: 'RTV',  name: 'Возврат продавцу', description: 'Return to vendor',   color: '#DC2626', utilization: 20, blocked: false },
  { code: 'DAM',  name: 'Повреждённое',     description: 'Damaged',            color: '#991B1B', utilization: 10, blocked: false },
  { code: 'QRT',  name: 'Карантин',         description: 'Спорный товар',      color: '#FBBF24', utilization: 8,  blocked: false },
  { code: 'PIC',  name: 'Зона сборки',      description: 'Active picking',     color: '#10B981', utilization: 60, blocked: false },
  { code: 'BULK', name: 'Резерв',           description: 'Reserve storage',    color: '#6366F1', utilization: 78, blocked: false },
  { code: 'PCK',  name: 'Упаковка',         description: 'Packing stations',   color: '#14B8A6', utilization: 42, blocked: false },
  { code: 'SRT',  name: 'Сортировка',       description: 'Sortation',          color: '#0EA5E9', utilization: 35, blocked: false },
  { code: 'OUT',  name: 'Отправка',         description: 'Outbound',           color: '#22C55E', utilization: 28, blocked: false },
  { code: 'RET',  name: 'Возвраты',         description: 'Returns',            color: '#F43F5E', utilization: 22, blocked: false },
];

// ═══════════════════════════════════════════════════════════
// 3. АДРЕСНАЯ СИСТЕМА ЯЧЕЕК
// ═══════════════════════════════════════════════════════════

export type BinStatus = 'active' | 'blocked' | 'maintenance' | 'reserved';
export type StorageType = 'folded' | 'hanging' | 'shoes' | 'accessories' | 'pallet' | 'bulk';

export interface Bin {
  id: string;
  warehouse: string;
  zone: ZoneCode;
  aisle: string;
  rack: string;
  section?: string;
  shelf: string;
  bin: string;
  storageType: StorageType;
  capacity: number;
  currentUnits: number;
  currentSku?: string;
  status: BinStatus;
  lastCountAt?: string;
  lastMovementAt?: string;
}

const formatBinId = (zone: ZoneCode, aisle: string, rack: string, section: string, shelf: string, bin: string) =>
  `WH01-${zone}-${aisle}-${rack}-${section}-${shelf}-${bin}`;

function generateBins(): Bin[] {
  const bins: Bin[] = [];
  // FLD (4×12×4×8)
  for (let a = 1; a <= 4; a++) {
    for (let r = 1; r <= 12; r++) {
      for (let s = 1; s <= 4; s++) {
        for (let b = 1; b <= 8; b++) {
          bins.push({
            id: formatBinId('FLD', `A${a.toString().padStart(2,'0')}`, `R${r.toString().padStart(2,'0')}`, 'B', `S${s.toString().padStart(2,'0')}`, `B${b.toString().padStart(2,'0')}`),
            warehouse: 'WH01', zone: 'FLD',
            aisle: `A${a.toString().padStart(2,'0')}`, rack: `R${r.toString().padStart(2,'0')}`,
            section: 'B', shelf: `S${s.toString().padStart(2,'0')}`, bin: `B${b.toString().padStart(2,'0')}`,
            storageType: 'folded', capacity: 120,
            currentUnits: Math.floor(Math.random() * 100),
            status: 'active',
          });
        }
      }
    }
  }
  // HNG (2×6×3×6)
  for (let a = 1; a <= 2; a++) {
    for (let r = 1; r <= 6; r++) {
      for (let s = 1; s <= 3; s++) {
        for (let b = 1; b <= 6; b++) {
          bins.push({
            id: formatBinId('HNG', `A${a.toString().padStart(2,'0')}`, `R${r.toString().padStart(2,'0')}`, 'A', `S${s.toString().padStart(2,'0')}`, `B${b.toString().padStart(2,'0')}`),
            warehouse: 'WH01', zone: 'HNG',
            aisle: `A${a.toString().padStart(2,'0')}`, rack: `R${r.toString().padStart(2,'0')}`,
            section: 'A', shelf: `S${s.toString().padStart(2,'0')}`, bin: `B${b.toString().padStart(2,'0')}`,
            storageType: 'hanging', capacity: 30,
            currentUnits: Math.floor(Math.random() * 25),
            status: 'active',
          });
        }
      }
    }
  }
  // SHS
  for (let r = 1; r <= 8; r++) {
    for (let s = 1; s <= 4; s++) {
      for (let b = 1; b <= 6; b++) {
        bins.push({
          id: formatBinId('SHS', 'A01', `R${r.toString().padStart(2,'0')}`, 'A', `S${s.toString().padStart(2,'0')}`, `B${b.toString().padStart(2,'0')}`),
          warehouse: 'WH01', zone: 'SHS',
          aisle: 'A01', rack: `R${r.toString().padStart(2,'0')}`,
          section: 'A', shelf: `S${s.toString().padStart(2,'0')}`, bin: `B${b.toString().padStart(2,'0')}`,
          storageType: 'shoes', capacity: 40,
          currentUnits: Math.floor(Math.random() * 30),
          status: 'active',
        });
      }
    }
  }
  return bins;
}

export const mockBins: Bin[] = generateBins();

const KEY_BINS = [
  { id: 'WH01-FLD-A04-R12-B-S03-B08', sku: 'SKU-NIK-TSH-BLK-M', units: 84 },
  { id: 'WH01-FLD-A04-R12-B-S03-B07', sku: 'SKU-NIK-TSH-BLK-L', units: 56 },
  { id: 'WH01-FLD-A04-R12-B-S03-B06', sku: 'SKU-NIK-TSH-WHT-M', units: 72 },
  { id: 'WH01-FLD-A05-R02-B-S01-B01', sku: 'SKU-ADI-HD-GRY-L',  units: 31 },
  { id: 'WH01-HNG-A01-R03-A-S02-B02', sku: 'SKU-ZARA-CT-BLK-M', units: 12 },
  { id: 'WH01-SHS-A01-R04-A-S02-B03', sku: 'SKU-NIK-AR-WHT-42', units: 18 },
  { id: 'WH01-FLD-A04-R12-B-S03-B05', sku: 'SKU-PUM-SH-RED-S',  units: 5 },
];

KEY_BINS.forEach(kb => {
  const bin = mockBins.find(b => b.id === kb.id);
  if (bin) { bin.currentSku = kb.sku; bin.currentUnits = kb.units; }
});

// ═══════════════════════════════════════════════════════════
// 4. ПРОДАВЦЫ И ТОВАРЫ
// ═══════════════════════════════════════════════════════════

export interface Seller {
  id: string;
  name: string;
  rating: number;
  defectRate: number;
  riskScore: 'low' | 'medium' | 'high';
}

export const mockSellers: Seller[] = [
  { id: 'SEL-001', name: 'NikeStore PL',     rating: 4.8, defectRate: 0.4, riskScore: 'low' },
  { id: 'SEL-002', name: 'AdidasOriginals',  rating: 4.6, defectRate: 0.7, riskScore: 'low' },
  { id: 'SEL-003', name: 'Zara Wholesale',   rating: 4.3, defectRate: 1.2, riskScore: 'medium' },
  { id: 'SEL-004', name: 'Puma Direct',      rating: 4.5, defectRate: 0.9, riskScore: 'low' },
  { id: 'SEL-005', name: 'FastFashion Co',   rating: 3.4, defectRate: 4.8, riskScore: 'high' },
];

export type Gender = 'men' | 'women' | 'kids' | 'unisex';
export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  gender: Gender;
  season: Season;
  material?: string;
  country?: string;
  sellerId: string;
  description?: string;
  photoEmoji: string;
}

export interface SKU {
  id: string;
  productId: string;
  barcode: string;
  color: string;
  size: string;
  fit?: string;
  weightKg: number;
  dimensionsCm: { l: number; w: number; h: number };
  storageType: StorageType;
  status: 'available' | 'reserved' | 'damaged' | 'quarantine' | 'lost';
}

export const mockProducts: Product[] = [
  { id: 'PRD-NIK-TSH', name: 'Nike Basic T-Shirt',     brand: 'Nike',          category: 'T-shirt', gender: 'men',   season: 'summer', material: 'Cotton 100%',  country: 'Turkey',  sellerId: 'SEL-001', photoEmoji: '👕' },
  { id: 'PRD-ADI-HD',  name: 'Adidas Originals Hoodie', brand: 'Adidas',       category: 'Hoodie',  gender: 'men',   season: 'fall',   material: 'Cotton/Poly',  country: 'Vietnam', sellerId: 'SEL-002', photoEmoji: '🧥' },
  { id: 'PRD-ZARA-CT', name: 'Zara Wool Coat',         brand: 'Zara',          category: 'Coat',    gender: 'women', season: 'winter', material: 'Wool 70%',     country: 'Spain',   sellerId: 'SEL-003', photoEmoji: '🧥' },
  { id: 'PRD-NIK-AR',  name: 'Nike Air Max 90',        brand: 'Nike',          category: 'Shoes',   gender: 'unisex',season: 'all',    material: 'Leather/Mesh', country: 'Vietnam', sellerId: 'SEL-001', photoEmoji: '👟' },
  { id: 'PRD-PUM-SH',  name: 'Puma Cotton Shirt',      brand: 'Puma',          category: 'Shirt',   gender: 'women', season: 'summer', material: 'Cotton 100%',  country: 'Turkey',  sellerId: 'SEL-004', photoEmoji: '👚' },
  { id: 'PRD-FF-DR',   name: 'Summer Dress',           brand: 'FastFashion',   category: 'Dress',   gender: 'women', season: 'summer', material: 'Polyester',    country: 'China',   sellerId: 'SEL-005', photoEmoji: '👗' },
];

export const mockSKUs: SKU[] = [
  { id: 'SKU-NIK-TSH-BLK-M', productId: 'PRD-NIK-TSH', barcode: '8690000000012', color: 'Black', size: 'M', weightKg: 0.25, dimensionsCm: { l: 30, w: 20, h: 3 }, storageType: 'folded',  status: 'available' },
  { id: 'SKU-NIK-TSH-BLK-L', productId: 'PRD-NIK-TSH', barcode: '8690000000013', color: 'Black', size: 'L', weightKg: 0.27, dimensionsCm: { l: 32, w: 22, h: 3 }, storageType: 'folded',  status: 'available' },
  { id: 'SKU-NIK-TSH-WHT-M', productId: 'PRD-NIK-TSH', barcode: '8690000000014', color: 'White', size: 'M', weightKg: 0.25, dimensionsCm: { l: 30, w: 20, h: 3 }, storageType: 'folded',  status: 'available' },
  { id: 'SKU-ADI-HD-GRY-L',  productId: 'PRD-ADI-HD',  barcode: '8690000000020', color: 'Grey',  size: 'L', weightKg: 0.65, dimensionsCm: { l: 35, w: 25, h: 6 }, storageType: 'folded',  status: 'available' },
  { id: 'SKU-ZARA-CT-BLK-M', productId: 'PRD-ZARA-CT', barcode: '8690000000030', color: 'Black', size: 'M', weightKg: 1.40, dimensionsCm: { l: 80, w: 50, h: 5 }, storageType: 'hanging', status: 'available' },
  { id: 'SKU-NIK-AR-WHT-42', productId: 'PRD-NIK-AR',  barcode: '8690000000040', color: 'White', size: '42',weightKg: 0.85, dimensionsCm: { l: 35, w: 25, h: 13},storageType: 'shoes',   status: 'available' },
  { id: 'SKU-PUM-SH-RED-S',  productId: 'PRD-PUM-SH',  barcode: '8690000000050', color: 'Red',   size: 'S', weightKg: 0.20, dimensionsCm: { l: 28, w: 18, h: 2 }, storageType: 'folded',  status: 'available' },
  { id: 'SKU-FF-DR-BLU-M',   productId: 'PRD-FF-DR',   barcode: '8690000000060', color: 'Blue',  size: 'M', weightKg: 0.35, dimensionsCm: { l: 40, w: 30, h: 3 }, storageType: 'hanging', status: 'available' },
];

// ═══════════════════════════════════════════════════════════
// 5. ПРОФИЛИ СОТРУДНИКОВ
// ═══════════════════════════════════════════════════════════

export interface WorkerProfile {
  id: string;
  badgeId: string;
  name: string;
  pin: string;
  role: WorkerRole;
  warehouseCode: string;
  warehouseName: string;
  zone?: ZoneCode;
  shiftStatus: 'on_shift' | 'on_break' | 'off';
  shiftStartedAt?: string;
  shiftPlanned: { start: string; end: string };
  productivity: number;
  errorRate: number;
  tasksCompletedToday: number;
}

export const mockWorkers: WorkerProfile[] = [
  { id: 'W-204', badgeId: 'BDG-204', name: 'Алексей Иванов',   pin: '1234', role: 'picker',                warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'FLD', shiftStatus: 'off', shiftPlanned: { start: '09:00', end: '18:00' }, productivity: 96, errorRate: 0.8, tasksCompletedToday: 0 },
  { id: 'W-101', badgeId: 'BDG-101', name: 'Виктор Петров',    pin: '1234', role: 'receiver',              warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'INB', shiftStatus: 'off', shiftPlanned: { start: '08:00', end: '17:00' }, productivity: 92, errorRate: 1.2, tasksCompletedToday: 0 },
  { id: 'W-302', badgeId: 'BDG-302', name: 'Мария Сидорова',   pin: '1234', role: 'qc_inspector',          warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'QC',  shiftStatus: 'off', shiftPlanned: { start: '09:00', end: '18:00' }, productivity: 88, errorRate: 0.4, tasksCompletedToday: 0 },
  { id: 'W-405', badgeId: 'BDG-405', name: 'Дмитрий Кузнецов', pin: '1234', role: 'putaway',               warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'BULK',shiftStatus: 'off', shiftPlanned: { start: '09:00', end: '18:00' }, productivity: 90, errorRate: 1.1, tasksCompletedToday: 0 },
  { id: 'W-506', badgeId: 'BDG-506', name: 'Елена Васильева',  pin: '1234', role: 'packer',                warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'PCK', shiftStatus: 'off', shiftPlanned: { start: '10:00', end: '19:00' }, productivity: 94, errorRate: 0.6, tasksCompletedToday: 0 },
  { id: 'W-607', badgeId: 'BDG-607', name: 'Ольга Морозова',   pin: '1234', role: 'returns',               warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'RET', shiftStatus: 'off', shiftPlanned: { start: '09:00', end: '18:00' }, productivity: 85, errorRate: 1.4, tasksCompletedToday: 0 },
  { id: 'W-708', badgeId: 'BDG-708', name: 'Сергей Орлов',     pin: '1234', role: 'inventory_controller',  warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'BULK',shiftStatus: 'off', shiftPlanned: { start: '08:00', end: '17:00' }, productivity: 91, errorRate: 0.7, tasksCompletedToday: 0 },
  { id: 'W-809', badgeId: 'BDG-809', name: 'Анна Лебедева',    pin: '1234', role: 'replenishment',         warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'PIC', shiftStatus: 'off', shiftPlanned: { start: '09:00', end: '18:00' }, productivity: 93, errorRate: 0.9, tasksCompletedToday: 0 },
  { id: 'W-910', badgeId: 'BDG-910', name: 'Игорь Соколов',    pin: '1234', role: 'shipper',               warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад', zone: 'OUT', shiftStatus: 'off', shiftPlanned: { start: '11:00', end: '20:00' }, productivity: 89, errorRate: 1.0, tasksCompletedToday: 0 },
  { id: 'W-001', badgeId: 'BDG-001', name: 'Никита Шевченко',  pin: '0000', role: 'shift_supervisor',      warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад',              shiftStatus: 'off', shiftPlanned: { start: '09:00', end: '18:00' }, productivity: 100, errorRate: 0, tasksCompletedToday: 0 },
  { id: 'W-002', badgeId: 'BDG-002', name: 'Татьяна Романова', pin: '0000', role: 'warehouse_manager',     warehouseCode: 'WH01', warehouseName: 'Москва · Главный склад',              shiftStatus: 'off', shiftPlanned: { start: '09:00', end: '20:00' }, productivity: 100, errorRate: 0, tasksCompletedToday: 0 },
];

// ═══════════════════════════════════════════════════════════
// 6. ASN
// ═══════════════════════════════════════════════════════════

export type InboundStatus = 'expected' | 'arrived' | 'docked' | 'unloading' | 'receiving' | 'qc_pending' | 'received' | 'discrepancy';

export interface ASNItem {
  id: string;
  skuId: string;
  expectedQty: number;
  actualQty: number;
  damagedQty: number;
  checked: boolean;
  qcStatus?: 'pending' | 'passed' | 'failed' | 'quarantine' | 'repack';
  damagePhotoUrls?: string[];
  notes?: string;
}

export interface ASN {
  id: string;
  manifestNo: string;
  sellerId: string;
  expectedAt: string;
  arrivedAt?: string;
  dockNo?: string;
  status: InboundStatus;
  items: ASNItem[];
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  boxCount: number;
  palletCount: number;
}

export const INBOUND_STATUS_CFG: Record<InboundStatus, { label: string; color: string; bg: string }> = {
  expected:    { label: 'Ожидается',    color: '#6B7280', bg: '#F3F4F6' },
  arrived:     { label: 'Прибыл',       color: '#2EA7E0', bg: '#DBEAFE' },
  docked:      { label: 'У ворот',      color: '#0EA5E9', bg: '#E0F2FE' },
  unloading:   { label: 'Разгрузка',    color: '#F59E0B', bg: '#FEF3C7' },
  receiving:   { label: 'Идёт приёмка', color: '#F59E0B', bg: '#FEF3C7' },
  qc_pending:  { label: 'На проверке',  color: '#A855F7', bg: '#F3E8FF' },
  received:    { label: 'Принят',       color: '#00D27A', bg: '#D1FAE5' },
  discrepancy: { label: 'Расхождение',  color: '#EF4444', bg: '#FEE2E2' },
};

export const mockASNs: ASN[] = [
  {
    id: 'INB-2026-00045', manifestNo: 'НК-2026-0421', sellerId: 'SEL-001',
    expectedAt: '2026-04-26T09:00:00', status: 'expected',
    boxCount: 24, palletCount: 4,
    driverName: 'Виктор', driverPhone: '+7 999 123-45-67', vehiclePlate: 'А777АА777',
    items: [
      { id: 'a1', skuId: 'SKU-NIK-TSH-BLK-M', expectedQty: 50, actualQty: 0, damagedQty: 0, checked: false },
      { id: 'a2', skuId: 'SKU-NIK-TSH-BLK-L', expectedQty: 30, actualQty: 0, damagedQty: 0, checked: false },
      { id: 'a3', skuId: 'SKU-NIK-TSH-WHT-M', expectedQty: 40, actualQty: 0, damagedQty: 0, checked: false },
      { id: 'a4', skuId: 'SKU-NIK-AR-WHT-42', expectedQty: 20, actualQty: 0, damagedQty: 0, checked: false },
    ],
  },
  {
    id: 'INB-2026-00046', manifestNo: 'НК-2026-0422', sellerId: 'SEL-002',
    expectedAt: '2026-04-26T11:30:00', arrivedAt: '2026-04-26T11:25:00',
    status: 'arrived', dockNo: 'D-03',
    boxCount: 18, palletCount: 3,
    driverName: 'Михаил', driverPhone: '+7 999 234-56-78', vehiclePlate: 'В123ВВ199',
    items: [
      { id: 'a5', skuId: 'SKU-ADI-HD-GRY-L', expectedQty: 25, actualQty: 0, damagedQty: 0, checked: false },
    ],
  },
  {
    id: 'INB-2026-00047', manifestNo: 'НК-2026-0423', sellerId: 'SEL-005',
    expectedAt: '2026-04-26T13:00:00', status: 'expected',
    boxCount: 40, palletCount: 6,
    items: [
      { id: 'a6', skuId: 'SKU-FF-DR-BLU-M', expectedQty: 100, actualQty: 0, damagedQty: 0, checked: false },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// 7. ТИПЫ ЗАДАЧ
// ═══════════════════════════════════════════════════════════

export type TaskType =
  | 'RECEIVE' | 'QC_CHECK' | 'PUTAWAY' | 'PICK' | 'PACK' | 'SORT' | 'LOAD'
  | 'RETURN_CHECK' | 'REPACK' | 'CYCLE_COUNT' | 'REPLENISHMENT' | 'MOVE_BIN'
  | 'DAMAGE_CHECK' | 'SECURITY_CHECK' | 'DEVICE_ISSUE';

export type TaskStatus = 'created' | 'assigned' | 'accepted' | 'in_progress' | 'waiting_scan' | 'waiting_supervisor' | 'blocked' | 'completed' | 'cancelled' | 'reassigned' | 'escalated';
export type TaskPriority = 'normal' | 'high' | 'urgent' | 'express';

export const ROLE_TASK_TYPES: Record<WorkerRole, TaskType[]> = {
  receiver: ['RECEIVE'],
  qc_inspector: ['QC_CHECK', 'DAMAGE_CHECK'],
  putaway: ['PUTAWAY', 'MOVE_BIN'],
  picker: ['PICK'],
  packer: ['PACK'],
  sorter: ['SORT'],
  shipper: ['LOAD'],
  returns: ['RETURN_CHECK'],
  repack: ['REPACK'],
  inventory_controller: ['CYCLE_COUNT'],
  replenishment: ['REPLENISHMENT'],
  forklift: ['MOVE_BIN'],
  maintenance: ['DEVICE_ISSUE'],
  security: ['SECURITY_CHECK'],
  shift_supervisor: ['RECEIVE','QC_CHECK','PUTAWAY','PICK','PACK','SORT','LOAD','RETURN_CHECK','REPACK','CYCLE_COUNT','REPLENISHMENT','MOVE_BIN','DAMAGE_CHECK','SECURITY_CHECK','DEVICE_ISSUE'],
  inbound_lead: ['RECEIVE','QC_CHECK','PUTAWAY'],
  outbound_lead: ['PACK','SORT','LOAD'],
  inventory_lead: ['CYCLE_COUNT','REPLENISHMENT','MOVE_BIN'],
  returns_lead: ['RETURN_CHECK','REPACK'],
  quality_manager: ['QC_CHECK','DAMAGE_CHECK'],
  warehouse_manager: ['RECEIVE','QC_CHECK','PUTAWAY','PICK','PACK','SORT','LOAD','RETURN_CHECK','REPACK','CYCLE_COUNT','REPLENISHMENT','MOVE_BIN','DAMAGE_CHECK','SECURITY_CHECK','DEVICE_ISSUE'],
  super_admin: ['RECEIVE','QC_CHECK','PUTAWAY','PICK','PACK','SORT','LOAD','RETURN_CHECK','REPACK','CYCLE_COUNT','REPLENISHMENT','MOVE_BIN','DAMAGE_CHECK','SECURITY_CHECK','DEVICE_ISSUE'],
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  RECEIVE: 'Приёмка', QC_CHECK: 'Контроль качества', PUTAWAY: 'Размещение',
  PICK: 'Сборка', PACK: 'Упаковка', SORT: 'Сортировка', LOAD: 'Погрузка',
  RETURN_CHECK: 'Проверка возврата', REPACK: 'Переупаковка',
  CYCLE_COUNT: 'Инвентаризация', REPLENISHMENT: 'Пополнение',
  MOVE_BIN: 'Перемещение', DAMAGE_CHECK: 'Проверка повреждения',
  SECURITY_CHECK: 'Проверка безопасности', DEVICE_ISSUE: 'Проблема с устройством',
};

export const TASK_TYPE_EMOJI: Record<TaskType, string> = {
  RECEIVE: '📥', QC_CHECK: '🔍', PUTAWAY: '📦', PICK: '🛒', PACK: '📦',
  SORT: '🔀', LOAD: '🚚', RETURN_CHECK: '↩️', REPACK: '🔧',
  CYCLE_COUNT: '📊', REPLENISHMENT: '🔄', MOVE_BIN: '➡️',
  DAMAGE_CHECK: '⚠️', SECURITY_CHECK: '🔒', DEVICE_ISSUE: '🛠️',
};

export const TASK_STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  created:            { label: 'Создана',          color: '#6B7280', bg: '#F3F4F6' },
  assigned:           { label: 'Назначена',        color: '#2EA7E0', bg: '#DBEAFE' },
  accepted:           { label: 'Принята',          color: '#0EA5E9', bg: '#E0F2FE' },
  in_progress:        { label: 'В работе',         color: '#F59E0B', bg: '#FEF3C7' },
  waiting_scan:       { label: 'Ждёт скан',        color: '#F59E0B', bg: '#FEF3C7' },
  waiting_supervisor: { label: 'Ждёт supervisor',  color: '#EF4444', bg: '#FEE2E2' },
  blocked:            { label: 'Заблокирована',    color: '#EF4444', bg: '#FEE2E2' },
  completed:          { label: 'Завершена',        color: '#00D27A', bg: '#D1FAE5' },
  cancelled:          { label: 'Отменена',         color: '#9CA3AF', bg: '#F3F4F6' },
  reassigned:         { label: 'Передана',         color: '#A855F7', bg: '#F3E8FF' },
  escalated:          { label: 'Эскалация',        color: '#DC2626', bg: '#FEE2E2' },
};

export const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string; bg: string; emoji: string; rank: number }> = {
  normal:  { label: 'Обычный',  color: '#6B7280', bg: '#F3F4F6', emoji: '🟢', rank: 3 },
  high:    { label: 'Высокий',  color: '#F59E0B', bg: '#FEF3C7', emoji: '🟡', rank: 2 },
  urgent:  { label: 'Срочно',   color: '#F97316', bg: '#FED7AA', emoji: '🟠', rank: 1 },
  express: { label: 'Экспресс', color: '#EF4444', bg: '#FEE2E2', emoji: '🔴', rank: 0 },
};

export interface ScanStep {
  id: string;
  type: 'bin' | 'sku' | 'tote' | 'order' | 'courier' | 'vehicle' | 'dock' | 'pallet' | 'box';
  label: string;
  expectedCode: string;
  scanned?: string;
  scannedAt?: string;
  ok?: boolean;
}

export interface TaskError {
  id: string;
  code: 'wrong_bin' | 'wrong_sku' | 'no_item' | 'damaged' | 'wrong_size' | 'wrong_color' | 'weight_mismatch' | 'unreadable_barcode' | 'shelf_blocked' | 'need_supervisor';
  message: string;
  createdAt: string;
}

export const ERROR_LABELS: Record<TaskError['code'], string> = {
  wrong_bin: 'Не та ячейка',
  wrong_sku: 'Не тот товар',
  no_item: 'Товара нет в ячейке',
  damaged: 'Товар повреждён',
  wrong_size: 'Не тот размер',
  wrong_color: 'Не тот цвет',
  weight_mismatch: 'Вес не совпал',
  unreadable_barcode: 'Штрихкод не читается',
  shelf_blocked: 'Полка/стеллаж заблокирован',
  need_supervisor: 'Нужна помощь старшего',
};

export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
  zone?: ZoneCode;
  createdAt: string;
  deadlineAt?: string;
  startedAt?: string;
  completedAt?: string;
  payload: {
    asnId?: string;
    asnItemId?: string;
    skuId?: string;
    qty?: number;
    fromBinId?: string;
    toBinId?: string;
    orderId?: string;
    toteId?: string;
    packageId?: string;
    courierId?: string;
    routeId?: string;
    rmaId?: string;
    binId?: string;
  };
  scanSteps?: ScanStep[];
  errors?: TaskError[];
  photos?: string[];
  notes?: string;
}

// ═══════════════════════════════════════════════════════════
// 8. ЗАКАЗЫ
// ═══════════════════════════════════════════════════════════

export type OrderStatus =
  | 'new' | 'inventory_checking' | 'reserved' | 'released' | 'picking_assigned'
  | 'picking' | 'picked' | 'packing_assigned' | 'packing' | 'packed'
  | 'sorting' | 'ready_for_dispatch' | 'loaded' | 'handed_to_courier'
  | 'in_transit' | 'delivered' | 'failed' | 'returning' | 'returned'
  | 'cancelled' | 'problem';

export const ORDER_STATUS_CFG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new:                  { label: 'Новый',                color: '#6B7280', bg: '#F3F4F6' },
  inventory_checking:   { label: 'Проверка наличия',     color: '#0EA5E9', bg: '#E0F2FE' },
  reserved:             { label: 'Зарезервирован',       color: '#0EA5E9', bg: '#E0F2FE' },
  released:             { label: 'Передан на склад',     color: '#2EA7E0', bg: '#DBEAFE' },
  picking_assigned:     { label: 'На сборку',            color: '#2EA7E0', bg: '#DBEAFE' },
  picking:              { label: 'Собирается',           color: '#F59E0B', bg: '#FEF3C7' },
  picked:               { label: 'Собран',               color: '#10B981', bg: '#D1FAE5' },
  packing_assigned:     { label: 'На упаковку',          color: '#A855F7', bg: '#F3E8FF' },
  packing:              { label: 'Упаковывается',        color: '#A855F7', bg: '#F3E8FF' },
  packed:               { label: 'Упакован',             color: '#14B8A6', bg: '#CCFBF1' },
  sorting:              { label: 'Сортируется',          color: '#0EA5E9', bg: '#E0F2FE' },
  ready_for_dispatch:   { label: 'Готов к отправке',     color: '#22C55E', bg: '#D1FAE5' },
  loaded:               { label: 'Загружен',             color: '#22C55E', bg: '#D1FAE5' },
  handed_to_courier:    { label: 'Передан курьеру',      color: '#00D27A', bg: '#D1FAE5' },
  in_transit:           { label: 'В пути',               color: '#00D27A', bg: '#D1FAE5' },
  delivered:            { label: 'Доставлен',            color: '#059669', bg: '#D1FAE5' },
  failed:               { label: 'Не доставлен',         color: '#EF4444', bg: '#FEE2E2' },
  returning:            { label: 'Возвращается',         color: '#F97316', bg: '#FED7AA' },
  returned:             { label: 'Возвращён',            color: '#F43F5E', bg: '#FFE4E6' },
  cancelled:            { label: 'Отменён',              color: '#9CA3AF', bg: '#F3F4F6' },
  problem:              { label: 'Проблема',             color: '#EF4444', bg: '#FEE2E2' },
};

export interface OrderItem {
  id: string;
  skuId: string;
  qty: number;
  pickedQty: number;
  binId: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerType: 'customer' | 'merchant';
  destinationCity: string;
  destinationZone: string;
  priority: TaskPriority;
  status: OrderStatus;
  createdAt: string;
  deadlineAt: string;
  items: OrderItem[];
  expectedWeightKg: number;
  recommendedPackage: 'BAG-S' | 'BAG-M' | 'BOX-S' | 'BOX-M' | 'BOX-L';
  toteId?: string;
  packageId?: string;
  actualWeightKg?: number;
  packedPhotoUrl?: string;
  courierId?: string;
  routeId?: string;
}

export const mockOrders: Order[] = [
  {
    id: 'ORD-2026-55001', customerName: 'Анна П.', customerType: 'customer',
    destinationCity: 'Warsaw', destinationZone: 'Zone-3',
    priority: 'express', status: 'released',
    createdAt: '2026-04-26T10:15:00', deadlineAt: '2026-04-26T11:00:00',
    expectedWeightKg: 0.92, recommendedPackage: 'BAG-M',
    items: [
      { id: 'oi1', skuId: 'SKU-NIK-TSH-BLK-M', qty: 1, pickedQty: 0, binId: 'WH01-FLD-A04-R12-B-S03-B08' },
      { id: 'oi2', skuId: 'SKU-ADI-HD-GRY-L',  qty: 1, pickedQty: 0, binId: 'WH01-FLD-A05-R02-B-S01-B01' },
    ],
  },
  {
    id: 'ORD-2026-55002', customerName: 'Magazyn ABC', customerType: 'merchant',
    destinationCity: 'Warsaw', destinationZone: 'Zone-1',
    priority: 'urgent', status: 'released',
    createdAt: '2026-04-26T10:20:00', deadlineAt: '2026-04-26T12:30:00',
    expectedWeightKg: 1.25, recommendedPackage: 'BOX-M',
    items: [
      { id: 'oi3', skuId: 'SKU-NIK-TSH-WHT-M', qty: 5, pickedQty: 0, binId: 'WH01-FLD-A04-R12-B-S03-B06' },
    ],
  },
  {
    id: 'ORD-2026-55003', customerName: 'Beata K.', customerType: 'customer',
    destinationCity: 'Krakow', destinationZone: 'Zone-2',
    priority: 'normal', status: 'released',
    createdAt: '2026-04-26T10:30:00', deadlineAt: '2026-04-26T15:00:00',
    expectedWeightKg: 0.85, recommendedPackage: 'BOX-S',
    items: [
      { id: 'oi4', skuId: 'SKU-NIK-AR-WHT-42', qty: 1, pickedQty: 0, binId: 'WH01-SHS-A01-R04-A-S02-B03' },
    ],
  },
  {
    id: 'ORD-2026-54998', customerName: 'Marek W.', customerType: 'customer',
    destinationCity: 'Warsaw', destinationZone: 'Zone-3',
    priority: 'high', status: 'packed',
    createdAt: '2026-04-26T09:00:00', deadlineAt: '2026-04-26T11:30:00',
    expectedWeightKg: 1.40, recommendedPackage: 'BOX-M',
    actualWeightKg: 1.39, toteId: 'TOTE-3301', packageId: 'PKG-991',
    items: [
      { id: 'oi5', skuId: 'SKU-ZARA-CT-BLK-M', qty: 1, pickedQty: 1, binId: 'WH01-HNG-A01-R03-A-S02-B02' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// 9. ВОЗВРАТЫ (RMA)
// ═══════════════════════════════════════════════════════════

export type RMAStatus = 'requested' | 'in_transit' | 'received' | 'inspecting' | 'resellable' | 'repack_needed' | 'damaged' | 'seller_dispute' | 'customer_dispute' | 'disposed' | 'returned_to_seller';
export type ReturnReason = 'wrong_size' | 'wrong_color' | 'damaged' | 'changed_mind' | 'not_as_described' | 'late_delivery' | 'duplicate';

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  wrong_size: 'Не подошёл размер',
  wrong_color: 'Не понравился цвет',
  damaged: 'Повреждён',
  changed_mind: 'Передумал',
  not_as_described: 'Не соответствует описанию',
  late_delivery: 'Поздняя доставка',
  duplicate: 'Дубликат',
};

export const RMA_STATUS_CFG: Record<RMAStatus, { label: string; color: string; bg: string }> = {
  requested:          { label: 'Запрошен',         color: '#6B7280', bg: '#F3F4F6' },
  in_transit:         { label: 'В пути',           color: '#0EA5E9', bg: '#E0F2FE' },
  received:           { label: 'Принят',           color: '#2EA7E0', bg: '#DBEAFE' },
  inspecting:         { label: 'Проверяется',      color: '#F59E0B', bg: '#FEF3C7' },
  resellable:         { label: 'В продажу',        color: '#00D27A', bg: '#D1FAE5' },
  repack_needed:      { label: 'Переупаковка',     color: '#A855F7', bg: '#F3E8FF' },
  damaged:            { label: 'Повреждён',        color: '#EF4444', bg: '#FEE2E2' },
  seller_dispute:     { label: 'Спор с продавцом', color: '#DC2626', bg: '#FEE2E2' },
  customer_dispute:   { label: 'Спор с клиентом',  color: '#DC2626', bg: '#FEE2E2' },
  disposed:           { label: 'Списан',           color: '#9CA3AF', bg: '#F3F4F6' },
  returned_to_seller: { label: 'Возвращён продавцу',color: '#7C3AED', bg: '#F3E8FF' },
};

export interface RMA {
  id: string;
  originalOrderId: string;
  customerName: string;
  reason: ReturnReason;
  reasonText?: string;
  status: RMAStatus;
  receivedAt?: string;
  inspectionResult?: 'resellable' | 'repack' | 'cleaning' | 'damaged' | 'rtv' | 'dispute' | 'dispose';
  inspectionNotes?: string;
  inspectionPhotos?: string[];
  items: { skuId: string; qty: number }[];
}

export const mockRMAs: RMA[] = [
  { id: 'RMA-2026-1001', originalOrderId: 'ORD-2026-54880', customerName: 'Joanna L.',  reason: 'wrong_size',   status: 'received',   receivedAt: '2026-04-26T09:30:00', items: [{ skuId: 'SKU-NIK-TSH-BLK-L', qty: 1 }] },
  { id: 'RMA-2026-1002', originalOrderId: 'ORD-2026-54855', customerName: 'Piotr R.',   reason: 'damaged',      status: 'inspecting', receivedAt: '2026-04-26T08:45:00', items: [{ skuId: 'SKU-ADI-HD-GRY-L', qty: 1 }] },
  { id: 'RMA-2026-1003', originalOrderId: 'ORD-2026-54802', customerName: 'Karolina M.',reason: 'changed_mind', status: 'received',   receivedAt: '2026-04-26T10:10:00', items: [{ skuId: 'SKU-NIK-AR-WHT-42', qty: 1 }] },
];

// ═══════════════════════════════════════════════════════════
// 10. CYCLE COUNT
// ═══════════════════════════════════════════════════════════

export type CountType = 'cycle' | 'blind' | 'high_value' | 'problem' | 'return' | 'full' | 'random';

export const COUNT_TYPE_LABELS: Record<CountType, string> = {
  cycle: 'Регулярная',
  blind: 'Слепая',
  high_value: 'Дорогой товар',
  problem: 'После ошибки',
  return: 'После возвратов',
  full: 'Полная',
  random: 'Случайная',
};

export interface CountTask {
  id: string;
  type: CountType;
  binId: string;
  expectedQty: number;
  countedQty?: number;
  difference?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'discrepancy';
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
}

export const mockCountTasks: CountTask[] = [
  { id: 'CNT-1', type: 'cycle',      binId: 'WH01-FLD-A04-R12-B-S03-B08', expectedQty: 84, status: 'pending', createdAt: '2026-04-26T08:00:00' },
  { id: 'CNT-2', type: 'high_value', binId: 'WH01-HNG-A01-R03-A-S02-B02', expectedQty: 12, status: 'pending', createdAt: '2026-04-26T08:00:00' },
  { id: 'CNT-3', type: 'problem',    binId: 'WH01-FLD-A04-R12-B-S03-B05', expectedQty: 5,  status: 'pending', createdAt: '2026-04-26T09:00:00' },
];

// ═══════════════════════════════════════════════════════════
// 11. REPLENISHMENT
// ═══════════════════════════════════════════════════════════

export interface ReplenishTask {
  id: string;
  skuId: string;
  fromBinId: string;
  toBinId: string;
  qty: number;
  priority: TaskPriority;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  reason: string;
}

export const mockReplenishTasks: ReplenishTask[] = [
  { id: 'REP-1', skuId: 'SKU-PUM-SH-RED-S', fromBinId: 'WH01-BULK-A01-R01-A-S01-B01', toBinId: 'WH01-FLD-A04-R12-B-S03-B05', qty: 30, priority: 'urgent', status: 'pending', createdAt: '2026-04-26T08:30:00', reason: 'Pick bin ниже минимума: 5 < 20' },
];

// ═══════════════════════════════════════════════════════════
// 12. ИНЦИДЕНТЫ
// ═══════════════════════════════════════════════════════════

export type IncidentType = 'damage' | 'missing' | 'shelf_broken' | 'safety' | 'theft' | 'device' | 'other';

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  damage: 'Повреждение товара',
  missing: 'Не найден товар',
  shelf_broken: 'Сломан стеллаж/полка',
  safety: 'Безопасность / травма',
  theft: 'Подозрение на кражу',
  device: 'Проблема с устройством',
  other: 'Другое',
};

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  reportedBy: string;
  binId?: string;
  skuId?: string;
  taskId?: string;
  photos: string[];
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
}

export const mockIncidents: Incident[] = [
  { id: 'INC-001', type: 'damage', description: 'Кофта Adidas с пятном на рукаве', reportedBy: 'W-302', skuId: 'SKU-ADI-HD-GRY-L', photos: [], status: 'investigating', createdAt: '2026-04-26T09:15:00' },
];

// ═══════════════════════════════════════════════════════════
// 13. АЛЕРТЫ
// ═══════════════════════════════════════════════════════════

export type AlertType = 'low_stock' | 'expiry' | 'discrepancy' | 'message' | 'urgent_order' | 'qc_alert' | 'incident' | 'sla_breach';

export interface WarehouseAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  actionLabel?: string;
  actionLink?: string;
  priority: 'low' | 'medium' | 'high';
}

export const ALERT_CFG: Record<AlertType, { color: string; bg: string; emoji: string }> = {
  low_stock:    { color: '#F59E0B', bg: '#FEF3C7', emoji: '⚠️' },
  expiry:       { color: '#EF4444', bg: '#FEE2E2', emoji: '⏰' },
  discrepancy:  { color: '#EF4444', bg: '#FEE2E2', emoji: '📊' },
  message:      { color: '#2EA7E0', bg: '#DBEAFE', emoji: '💬' },
  urgent_order: { color: '#EF4444', bg: '#FEE2E2', emoji: '🚨' },
  qc_alert:     { color: '#A855F7', bg: '#F3E8FF', emoji: '🔍' },
  incident:     { color: '#DC2626', bg: '#FEE2E2', emoji: '🚧' },
  sla_breach:   { color: '#F97316', bg: '#FED7AA', emoji: '⏱️' },
};

export const mockAlerts: WarehouseAlert[] = [
  { id: 'al1', type: 'urgent_order', title: 'Express заказ ORD-55001',           description: 'Дедлайн через 30 минут',                   createdAt: '2026-04-26T10:30:00', read: false, priority: 'high',   actionLabel: 'Открыть',     actionLink: '/orders/ORD-2026-55001' },
  { id: 'al2', type: 'low_stock',    title: 'PUM-SH-RED-S заканчивается',         description: 'Осталось 5 шт. (минимум 20)',              createdAt: '2026-04-26T09:30:00', read: false, priority: 'medium', actionLabel: 'Пополнить',   actionLink: '/replenishment' },
  { id: 'al3', type: 'qc_alert',     title: 'Высокий брак продавца SEL-005',      description: 'Defect rate 4.8%, требуется 100% QC',      createdAt: '2026-04-26T08:30:00', read: false, priority: 'high',   actionLabel: 'Проверить',   actionLink: '/inbound' },
  { id: 'al4', type: 'message',      title: 'Сообщение от руководства',           description: 'Инвентаризация в пятницу 15:00',           createdAt: '2026-04-26T07:45:00', read: true,  priority: 'low' },
  { id: 'al5', type: 'incident',     title: 'Инцидент INC-001',                   description: 'Повреждение товара в QC',                  createdAt: '2026-04-26T09:15:00', read: false, priority: 'medium', actionLabel: 'Посмотреть',  actionLink: '/incidents' },
];

// ═══════════════════════════════════════════════════════════
// 14. KPI
// ═══════════════════════════════════════════════════════════

export interface ShiftKPI {
  ordersPerHour: number;
  pickingAccuracy: number;
  packingAccuracy: number;
  inventoryAccuracy: number;
  onTimeDispatch: number;
  returnRate: number;
  damageRate: number;
  warehouseUtilization: number;
  staffOnline: number;
  totalStaff: number;
  delayedOrders: number;
  problemOrders: number;
}

export const mockShiftKPI: ShiftKPI = {
  ordersPerHour: 142,
  pickingAccuracy: 99.2,
  packingAccuracy: 99.6,
  inventoryAccuracy: 98.7,
  onTimeDispatch: 96.4,
  returnRate: 8.3,
  damageRate: 1.1,
  warehouseUtilization: 64,
  staffOnline: 7,
  totalStaff: 11,
  delayedOrders: 3,
  problemOrders: 2,
};

// ═══════════════════════════════════════════════════════════
// 15. AUDIT LOG (журнал действий)
// ═══════════════════════════════════════════════════════════

export interface AuditLogEntry {
  id: string;
  workerId: string;
  workerName: string;
  action: string;
  details: string;
  taskId?: string;
  binId?: string;
  skuId?: string;
  timestamp: string;
}

export const mockAuditLog: AuditLogEntry[] = [
  { id: 'log1', workerId: 'W-302', workerName: 'Мария Сидорова',  action: 'QC_FAILED',     details: 'SKU-ADI-HD-GRY-L: пятно на рукаве',                              taskId: 'T-QC-1', timestamp: '2026-04-26T09:15:00' },
  { id: 'log2', workerId: 'W-204', workerName: 'Алексей Иванов',  action: 'PICK_SCAN',     details: 'Отсканирована ячейка WH01-FLD-A04-R12-B-S03-B08',               taskId: 'T-PICK-1',timestamp: '2026-04-26T10:20:00' },
  { id: 'log3', workerId: 'W-101', workerName: 'Виктор Петров',   action: 'RECEIVE_START', details: 'Начата приёмка INB-2026-00046 у dock D-03',                     taskId: 'T-RCV-1', timestamp: '2026-04-26T11:30:00' },
];
