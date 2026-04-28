# @wms/warehouse-app

Рабочее приложение склада. Получает заказы и задачи из Admin Panel и обновляет статусы по жизненному циклу.

- **Маршрут на VPS:** `/warehouse/`
- **Dev-порт:** `5180`
- **API:** относительный `/api` (Vite-прокси → `VITE_API_URL`, по умолчанию `http://localhost:4000`)

## Связь с Admin Panel

| Admin Panel (контроль) | Warehouse App (исполнение) |
| --- | --- |
| Список складов, KPI, документы, аудит | Смены, задачи, сборка, упаковка, передача курьеру |
| Создаёт задачи, читает статусы | Меняет статусы и пишет события |

Admin Panel **не пишет** статусы заказов в зоне ответственности склада — только читает. Все изменения идут из Warehouse App.

## Контракт статусов заказа

```
received_by_warehouse
    → picking_assigned
    → picking_in_progress
    → picked
    → packing_in_progress
    → packed
    → ready_for_pickup
    → handed_to_courier
```

Точное определение допустимых переходов: [`src/app/domain/orderStatus.ts`](src/app/domain/orderStatus.ts).

## Модули

Дашборд · Смена · Задачи · Сборка · Упаковка · Сканер · Готово к выдаче · Передача курьеру · Приёмка · Остатки · Ячейки · Инвентаризация · Возвраты · Проблемы · Документы · Отчёты.

## Запуск

```bash
npm --workspace apps/warehouse-app run dev      # http://localhost:5180
npm --workspace apps/warehouse-app run build
npm --workspace apps/warehouse-app run preview  # http://localhost:4180
```
