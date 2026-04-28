# @wms/warehouse-app

Рабочее приложение склада — отдельный workspace, **исполнитель** в паре с Admin Panel (контроль). Меняет статусы заказов и пишет audit, который admin-panel читает.

- **Маршрут на VPS:** `/warehouse/`
- **Dev-порт:** `5180`
- **API:** относительный `/api` (Vite-прокси → `VITE_API_URL`, по умолчанию `http://localhost:4000`)

## Связь с другими приложениями

| Приложение | Роль | Что видит из warehouse-app |
| --- | --- | --- |
| **admin-panel** | контроль | склады, KPI, статусы, документы, audit, может создавать задачи |
| **seller-app**  | продавец | остаток своих SKU, статусы своих заказов |
| **courier-app** | курьер | заказы только в `ready_for_pickup` (адрес, кол-во пакетов, pickup-код) |
| **customer-app** | клиент | публичные статусы (принят / собирается / упакован / передан / в доставке / доставлен) |

Warehouse App — единственный, кто пишет статусы в зоне ответственности склада. Admin Panel читает.

## Контракт жизненного цикла заказа (12 статусов)

```
received_by_warehouse → picking_assigned → picking_in_progress
→ picked → sorting → packing_in_progress → packed
→ ready_for_pickup → handed_to_courier
                   ↳ returned
cancelled · problem (как тупиковые/служебные)
```

Допустимые переходы — `src/app/domain/orderStatus.ts` (`NEXT_STATUSES`). Backend будет валидировать ту же таблицу.

## Защита от ошибок

В каждом действии: фото товара, SKU, barcode, order ID, количество, цвет зоны, точная ячейка, сканирование с проверкой, audit. Любое несовпадение даёт красное предупреждение и автоматически создаёт problem-ticket — продолжать без разрешения Shift Manager / Warehouse Admin нельзя.

## Роли (8) и права

`warehouse_admin` · `shift_manager` · `picker` · `packer` · `receiver` · `inventory_controller` · `returns_operator` · `dispatcher`. Матрица в `src/app/domain/roles.ts`. Каждый раздел в роуте обёрнут в `<RoleGuard perm="…">` — недоступные пункты не отображаются в sidebar.

## Цветные зоны (8)

RED · BLUE · GREEN · YELLOW · PURPLE · GRAY · ORANGE · BLACK — `src/app/domain/zones.ts`. Цвет зоны — главный визуальный якорь: бейдж зоны на карточке товара/ячейки/маршрута/сортировочной корзины.

## 20 разделов (sidebar)

Моя смена · Dashboard · Задачи · Заказы на сборку · Сборка · Сортировка · Упаковка · Готово к выдаче · Передача курьеру · Приёмка · Остатки · Ячейки · Инвентаризация · Перемещения · Возвраты · Проблемы · Сканер · Документы · Отчёты · Настройки смены.

## Сканирование

Универсальный сканер с типами: `BIN`, `ITEM`, `ZONE`, `ORDER`, `PACKAGE`, `COURIER`, `RETURN`, `INVOICE`. Сборка валидирует ячейку → товар → количество, при ошибке создаёт problem.

## Запуск

```bash
npm install                                    # из корня монорепо
npm --workspace apps/warehouse-app run dev     # http://localhost:5180
npm --workspace apps/warehouse-app run build
npm --workspace apps/warehouse-app run preview # http://localhost:4180
```

## Структура

```
src/
├── main.tsx
├── styles/globals.css
└── app/
    ├── App.tsx
    ├── domain/
    │   ├── orderStatus.ts   # 12 статусов + переходы
    │   ├── zones.ts         # 8 цветных зон
    │   ├── roles.ts         # 8 ролей + матрица прав
    │   ├── sortBins.ts      # сортировочные корзины
    │   ├── types.ts         # все доменные типы
    │   └── mock.ts          # стартовые данные для каркаса
    ├── store/useStore.ts    # state + бизнес-методы + audit log
    ├── components/
    │   ├── AppShell.tsx
    │   ├── PageHeader.tsx
    │   ├── EmptyState.tsx
    │   ├── ZoneBadge.tsx
    │   ├── StatusBadge.tsx
    │   ├── ItemCard.tsx     # фото, SKU, barcode, артикул, qty, зона, ячейка
    │   ├── ScanInput.tsx
    │   ├── Modal.tsx
    │   └── RoleGuard.tsx
    └── pages/               # 22 страницы (20 разделов + Login + Dashboard)
```
