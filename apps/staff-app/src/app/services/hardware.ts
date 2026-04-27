/**
 * Hardware Abstraction Layer (HAL).
 *
 * Сейчас всё работает через mock/manual ввод. Когда придёт реальное оборудование,
 * нужно подменить только эти классы — остальное приложение менять не нужно.
 *
 * Пример замены ScannerService на реальный USB-сканер:
 *   class UsbScannerService extends ScannerService {
 *     scan() { return this.bridge.usb.read(); }
 *   }
 *   DeviceManager.instance.scanner = new UsbScannerService();
 */

export type DeviceKind = 'scanner' | 'scale' | 'printer' | 'camera' | 'rfid';

export interface DeviceStatus {
  kind: DeviceKind;
  connected: boolean;
  model: string;
  battery?: number; // 0..100
  lastError?: string;
}

// ─── Базовый интерфейс устройства ───────────────────────────
abstract class BaseService {
  status: DeviceStatus;
  protected listeners = new Set<(s: DeviceStatus) => void>();

  constructor(kind: DeviceKind, model: string) {
    this.status = { kind, connected: true, model, battery: 92 };
  }

  onStatusChange(cb: (s: DeviceStatus) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  protected emit() { this.listeners.forEach(cb => cb(this.status)); }
}

// ─── СКАНЕР ─────────────────────────────────────────────────
/**
 * Интерфейс для штрихкод-сканера.
 * Реальные реализации: USB HID-сканер, Bluetooth-сканер, камера телефона.
 */
export class ScannerService extends BaseService {
  private resolveScan?: (code: string) => void;
  private rejectScan?: (err: Error) => void;

  constructor() { super('scanner', 'Mock Scanner v1'); }

  /** Запросить сканирование. Возвращает Promise с кодом. */
  scan(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolveScan = resolve;
      this.rejectScan = reject;
      // В mock-режиме код придёт из BarcodeScannerModal через provideMockScan()
    });
  }

  /** Mock-режим: внешний код «передаёт» отсканированный штрихкод. */
  provideMockScan(code: string) {
    if (this.resolveScan) {
      this.resolveScan(code);
      this.resolveScan = undefined;
      this.rejectScan = undefined;
    }
  }

  cancel() {
    if (this.rejectScan) {
      this.rejectScan(new Error('Сканирование отменено'));
      this.resolveScan = undefined;
      this.rejectScan = undefined;
    }
  }
}

// ─── ВЕСЫ ───────────────────────────────────────────────────
/**
 * Промышленные весы. Возвращают вес в кг.
 * Реальные: USB/RS232/Bluetooth весы, например CAS, Mettler.
 */
export class ScaleService extends BaseService {
  private mockValue: number = 0;

  constructor() { super('scale', 'Mock Scale 50kg'); }

  /** Считать текущий вес. */
  read(): Promise<number> {
    return Promise.resolve(this.mockValue);
  }

  /** Mock: установить вес для имитации (например, из UI ввода). */
  setMockWeight(kg: number) { this.mockValue = kg; }

  /** Сделать tare (обнулить). */
  tare() { this.mockValue = 0; }
}

// ─── ПРИНТЕР ─────────────────────────────────────────────────
/**
 * Принтер этикеток (Zebra, TSC и др.). Печатает PDF/ZPL/EPL.
 */
export class PrinterService extends BaseService {
  private printQueue: { id: string; type: string; payload: any; printedAt?: string }[] = [];

  constructor() { super('printer', 'Mock Zebra ZD420'); }

  /** Напечатать этикетку (shipping label, bin label, item label). */
  printLabel(type: 'shipping' | 'bin' | 'item' | 'pallet', payload: any): Promise<{ jobId: string }> {
    const jobId = `JOB-${Date.now()}`;
    this.printQueue.push({ id: jobId, type, payload, printedAt: new Date().toISOString() });
    // Имитируем задержку печати
    return new Promise(resolve => setTimeout(() => resolve({ jobId }), 300));
  }

  getQueue() { return this.printQueue.slice(-20); }
}

// ─── КАМЕРА / ФОТО ──────────────────────────────────────────
/**
 * Камера телефона/планшета для фото повреждений, упаковки.
 */
export class PhotoService extends BaseService {
  constructor() { super('camera', 'Device Camera'); }

  /** Сделать фото и получить URI. */
  takePhoto(label: string): Promise<{ uri: string; takenAt: string }> {
    // Mock: возвращаем псевдо-URI
    return Promise.resolve({
      uri: `photo://mock/${label}-${Date.now()}.jpg`,
      takenAt: new Date().toISOString(),
    });
  }
}

// ─── RFID ────────────────────────────────────────────────────
/**
 * RFID-ридер (для дорогих товаров и дверей).
 */
export class RFIDService extends BaseService {
  constructor() { super('rfid', 'Mock RFID UHF'); }

  /** Прочитать ближайший RFID-тег. */
  read(): Promise<{ tagId: string; rssi: number } | null> {
    return Promise.resolve(null); // в mock пока ничего не читаем
  }
}

// ─── DEVICE MANAGER ──────────────────────────────────────────
/**
 * Singleton-менеджер всех устройств.
 * Доступ из любой страницы: DeviceManager.instance.scanner.scan()
 */
export class DeviceManager {
  private static _instance: DeviceManager;

  scanner: ScannerService;
  scale: ScaleService;
  printer: PrinterService;
  camera: PhotoService;
  rfid: RFIDService;

  private constructor() {
    this.scanner = new ScannerService();
    this.scale = new ScaleService();
    this.printer = new PrinterService();
    this.camera = new PhotoService();
    this.rfid = new RFIDService();
  }

  static get instance(): DeviceManager {
    if (!this._instance) this._instance = new DeviceManager();
    return this._instance;
  }

  /** Получить статус всех устройств — для Settings и Supervisor. */
  getAllStatus(): DeviceStatus[] {
    return [this.scanner.status, this.scale.status, this.printer.status, this.camera.status, this.rfid.status];
  }
}

// ─── AUTOMATION SERVICE ──────────────────────────────────────
/**
 * Сервис автоматизации (auto-replenishment, auto-task-assignment).
 * Эта логика в реальной системе — это backend cron jobs.
 */
export class AutomationService {
  /** Проверить pick-зоны и создать REPLENISH задачи если нужно. */
  static checkLowStock(bins: Array<{ id: string; currentSku?: string; currentUnits: number; capacity: number }>) {
    return bins
      .filter(b => b.currentSku && b.currentUnits < 20 && b.currentUnits < b.capacity * 0.2)
      .map(b => ({
        binId: b.id,
        skuId: b.currentSku!,
        suggestedQty: Math.floor(b.capacity * 0.7) - b.currentUnits,
      }));
  }
}
