// ============================================================
//  WMS seed — creates roles, super admin, sample warehouse,
//  zones, locations, products, SKUs, inventory and a sample
//  seller + ASN so the system is immediately usable.
//
//  Run:  npm run db:seed   (after db:migrate)
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLES: Array<{ name: string; permissions: Record<string, boolean> }> = [
  { name: 'SUPER_ADMIN', permissions: { all: true } },
  { name: 'ADMIN', permissions: { manageUsers: true, manageWarehouses: true, viewAll: true } },
  { name: 'WAREHOUSE_MANAGER', permissions: { manageWarehouse: true, viewAll: true } },
  { name: 'SHIFT_SUPERVISOR', permissions: { manageShift: true, viewShift: true, reassignTasks: true } },
  { name: 'RECEIVER', permissions: { receive: true } },
  { name: 'QC_INSPECTOR', permissions: { qc: true } },
  { name: 'PUTAWAY_OPERATOR', permissions: { putaway: true } },
  { name: 'PICKER', permissions: { pick: true } },
  { name: 'PACKER', permissions: { pack: true } },
  { name: 'SORTER', permissions: { sort: true } },
  { name: 'SHIPPING_OPERATOR', permissions: { ship: true } },
  { name: 'RETURNS_OPERATOR', permissions: { returns: true } },
  { name: 'REPLENISHMENT_OPERATOR', permissions: { replenish: true } },
  { name: 'INVENTORY_CONTROLLER', permissions: { count: true, adjust: true } },
  { name: 'SELLER', permissions: { sellerPortal: true } },
  { name: 'COURIER_DISPATCHER', permissions: { dispatch: true } },
];

const USERS: Array<{ employeeId: string; fullName: string; pin: string; role: string }> = [
  { employeeId: 'W-000', fullName: 'Super Admin', pin: '0000', role: 'SUPER_ADMIN' },
  { employeeId: 'W-001', fullName: 'Никита Шевченко', pin: '0000', role: 'SHIFT_SUPERVISOR' },
  { employeeId: 'W-002', fullName: 'Татьяна Романова', pin: '0000', role: 'WAREHOUSE_MANAGER' },
  { employeeId: 'W-101', fullName: 'Виктор Петров', pin: '1234', role: 'RECEIVER' },
  { employeeId: 'W-302', fullName: 'Мария Сидорова', pin: '1234', role: 'QC_INSPECTOR' },
  { employeeId: 'W-405', fullName: 'Дмитрий Кузнецов', pin: '1234', role: 'PUTAWAY_OPERATOR' },
  { employeeId: 'W-204', fullName: 'Алексей Иванов', pin: '1234', role: 'PICKER' },
  { employeeId: 'W-506', fullName: 'Елена Васильева', pin: '1234', role: 'PACKER' },
  { employeeId: 'W-910', fullName: 'Игорь Соколов', pin: '1234', role: 'SHIPPING_OPERATOR' },
  { employeeId: 'W-607', fullName: 'Ольга Морозова', pin: '1234', role: 'RETURNS_OPERATOR' },
  { employeeId: 'W-708', fullName: 'Сергей Орлов', pin: '1234', role: 'INVENTORY_CONTROLLER' },
  { employeeId: 'W-809', fullName: 'Анна Лебедева', pin: '1234', role: 'REPLENISHMENT_OPERATOR' },
  { employeeId: 'S-001', fullName: 'Nike Official', pin: '1234', role: 'SELLER' },
  { employeeId: 'D-001', fullName: 'Dispatcher Demo', pin: '1234', role: 'COURIER_DISPATCHER' },
];

async function main() {
  console.log('[seed] Roles…');
  const roles: Record<string, string> = {};
  for (const r of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: r.name },
      update: { permissions: JSON.stringify(r.permissions) },
      create: { name: r.name, permissions: JSON.stringify(r.permissions) },
    });
    roles[r.name] = created.id;
  }

  console.log('[seed] Warehouse + zones + locations…');
  const wh = await prisma.warehouse.upsert({
    where: { code: 'WH-01' },
    update: {},
    create: { code: 'WH-01', name: 'Main Warehouse', address: 'Demo Address 1' },
  });

  const zoneSpecs = [
    { code: 'INB', name: 'Inbound', type: 'INBOUND' },
    { code: 'QC',  name: 'QC',      type: 'QC' },
    { code: 'FLD', name: 'Folded',  type: 'FOLDED' },
    { code: 'HNG', name: 'Hanging', type: 'HANGING' },
    { code: 'PCK', name: 'Packing', type: 'PACKING' },
    { code: 'OUT', name: 'Outbound',type: 'OUTBOUND' },
    { code: 'RET', name: 'Returns', type: 'RETURNS' },
  ];
  const zones: Record<string, string> = {};
  for (const z of zoneSpecs) {
    const created = await prisma.zone.upsert({
      where: { warehouseId_code: { warehouseId: wh.id, code: z.code } },
      update: {},
      create: { ...z, warehouseId: wh.id },
    });
    zones[z.code] = created.id;
  }

  // 6 sample folded locations
  for (let i = 1; i <= 6; i++) {
    const code = `WH01-FLD-A04-R12-S03-B0${i}`;
    await prisma.location.upsert({
      where: { code },
      update: {},
      create: {
        code, barcode: code, zoneId: zones.FLD,
        aisle: 'A04', rack: 'R12', section: 'B', shelf: 'S03', bin: `B0${i}`,
        capacity: 120, status: 'ACTIVE',
      },
    });
  }

  console.log('[seed] Users…');
  for (const u of USERS) {
    const pinHash = await bcrypt.hash(u.pin, 10);
    await prisma.user.upsert({
      where: { employeeId: u.employeeId },
      update: { pinHash, fullName: u.fullName, roleId: roles[u.role] },
      create: {
        employeeId: u.employeeId, pinHash, fullName: u.fullName,
        roleId: roles[u.role], warehouseId: wh.id, status: 'ACTIVE',
      },
    });
  }

  console.log('[seed] Seller + products + SKUs…');
  const seller = await prisma.seller.upsert({
    where: { code: 'SEL-001' },
    update: {},
    create: { code: 'SEL-001', name: 'Nike Official', email: 'seller@nike.demo' },
  });

  const product = await prisma.product.upsert({
    where: { sku: 'PRD-10001' },
    update: {},
    create: {
      sku: 'PRD-10001', name: 'Nike Basic T-Shirt',
      brand: 'Nike', category: 'T-shirt', gender: 'Men', material: 'Cotton',
      sellerId: seller.id,
    },
  });

  const skuSpecs = [
    { code: 'SKU-10001-BLK-M', barcode: '8690000000012', color: 'Black', size: 'M', weight: 0.25 },
    { code: 'SKU-10001-BLK-L', barcode: '8690000000029', color: 'Black', size: 'L', weight: 0.27 },
    { code: 'SKU-10001-WHT-M', barcode: '8690000000036', color: 'White', size: 'M', weight: 0.25 },
  ];
  for (const s of skuSpecs) {
    await prisma.sKU.upsert({
      where: { code: s.code },
      update: {},
      create: {
        ...s, productId: product.id, storageType: 'FOLDED',
      },
    });
  }

  console.log('[seed] Initial inventory…');
  const sku = await prisma.sKU.findUniqueOrThrow({ where: { code: 'SKU-10001-BLK-M' } });
  const loc = await prisma.location.findUniqueOrThrow({ where: { code: 'WH01-FLD-A04-R12-S03-B01' } });
  await prisma.inventoryItem.upsert({
    where: { skuId_locationId_status: { skuId: sku.id, locationId: loc.id, status: 'AVAILABLE' } },
    update: { quantity: 50 },
    create: { skuId: sku.id, locationId: loc.id, quantity: 50, status: 'AVAILABLE' },
  });

  console.log('[seed] Sample devices…');
  for (const d of [
    { code: 'SCAN-001', type: 'SCANNER', name: 'Zebra TC52' },
    { code: 'SCALE-001', type: 'SCALE', name: 'Mettler PS60' },
    { code: 'PRN-001', type: 'PRINTER', name: 'Zebra ZD230' },
  ]) {
    await prisma.device.upsert({
      where: { code: d.code }, update: {}, create: { ...d, status: 'ACTIVE' },
    });
  }

  console.log('[seed] Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
