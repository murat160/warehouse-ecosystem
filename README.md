# Warehouse Management System (WMS) — Ecosystem

Профессиональная WMS для маркетплейса одежды. Монорепо: один backend + 5 связанных frontend-приложений + общие пакеты + deploy-инфраструктура.

```
warehouse-ecosystem/
├── apps/
│   ├── staff-app/           # Сотрудники склада (picking, packing, qc, ...)
│   ├── admin-panel/         # Админ: управление всем
│   ├── supervisor-panel/    # Старший смены
│   ├── seller-portal/       # Продавцы (товары, ASN, returns)
│   └── courier-dispatch/    # Логистика, выдача курьерам
├── backend/
│   └── api/                 # Fastify + Prisma + SQLite (готов к PostgreSQL)
├── packages/
│   ├── shared-types/        # TS-типы + API client
│   ├── ui/                  # Общие UI-компоненты (Stage 3+)
│   └── warehouse-core/      # State machines, генераторы кодов
├── deploy/                  # Docker / nginx / deploy.sh
├── .github/workflows/       # GH Actions auto-deploy
├── package.json             # npm workspaces
├── README.md                # этот файл
└── README_DEPLOY.md         # пошаговый деплой на Hostinger VPS
```

## Стэк

| Слой | Технология |
|---|---|
| Backend | Node 20 · Fastify 5 · Prisma 5 · Zod · bcryptjs · @fastify/jwt |
| База | SQLite (dev) / PostgreSQL (prod) — переключается одной строкой в `.env` |
| Frontend | Vite 6 · React 18 · TypeScript · TailwindCSS 4 |
| Auth | JWT (Bearer), хранится в `localStorage` |
| Monorepo | npm workspaces (без pnpm/yarn) |
| Deploy | nginx + pm2 (или Docker Compose) на Hostinger VPS |
| CI | GitHub Actions → SSH → `deploy.sh` |

## Быстрый старт (локально)

> Нужен Node ≥ 20.

```bash
# 1. Установить все зависимости (workspace-aware)
npm install

# 2. Создать БД и накатить миграции + сидинг
cp .env.example .env
cd backend/api && cp .env.example .env && cd ../..
npm run db:migrate     # создаёт SQLite БД
npm run db:seed        # роли + пользователи + товары + локации

# 3. Запустить всё параллельно (API + 5 frontend)
npm run dev
```

Открыть в браузере:

| URL | Что |
|---|---|
| http://localhost:4000/api/health | Backend healthcheck |
| http://localhost:5173 | Staff App |
| http://localhost:5174 | Admin Panel |
| http://localhost:5175 | Supervisor Panel |
| http://localhost:5176 | Seller Portal |
| http://localhost:5177 | Courier Dispatch |

## Тестовые логины

| Employee ID | PIN | Роль |
|---|---|---|
| W-000 | 0000 | SUPER_ADMIN |
| W-001 | 0000 | SHIFT_SUPERVISOR |
| W-002 | 0000 | WAREHOUSE_MANAGER |
| W-101 | 1234 | RECEIVER |
| W-302 | 1234 | QC_INSPECTOR |
| W-405 | 1234 | PUTAWAY_OPERATOR |
| W-204 | 1234 | PICKER |
| W-506 | 1234 | PACKER |
| W-910 | 1234 | SHIPPING_OPERATOR |
| W-607 | 1234 | RETURNS_OPERATOR |
| W-708 | 1234 | INVENTORY_CONTROLLER |
| W-809 | 1234 | REPLENISHMENT_OPERATOR |
| S-001 | 1234 | SELLER |
| D-001 | 1234 | COURIER_DISPATCHER |

## API — основные эндпоинты

Все под префиксом `/api`. Защищены JWT (кроме `/api/auth/login` и `/api/health`).

| Group | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Users | `GET /users`, `POST /users`, `PATCH /users/:id` |
| Roles | `GET /roles` |
| Warehouses | `GET/POST/PATCH /warehouses` |
| Zones | `GET/POST /zones` |
| Locations | `GET /locations`, `GET /locations/by-barcode/:bc`, `POST /locations`, `PATCH /locations/:id/status` |
| Products | `GET/POST /products` |
| SKUs | `GET /skus`, `GET /skus/by-barcode/:bc`, `POST /skus` |
| Inventory | `GET /inventory`, `POST /inventory/adjust`, `POST /inventory/reserve` |
| Inbound | `GET/POST /inbound/asn`, `POST /inbound/receive`, `POST /inbound/qc/:taskId/decide`, `POST /inbound/putaway/:taskId/confirm` |
| Orders | `GET/POST /orders`, `POST /orders/:id/release`, `POST /orders/:id/cancel` |
| Tasks | `GET /tasks`, `POST /tasks`, `POST /tasks/:id/{accept,start,complete,assign,reassign,problem,transition}` |
| Picking | `GET /picking`, `POST /picking/:taskId/scan` |
| Packing | `GET /packing`, `POST /packing/:taskId/confirm` |
| Shipping | `GET /shipping/ready`, `POST /shipping/handoff`, `GET /shipping/manifest/:courierId` |
| Returns | `GET/POST /returns`, `POST /returns/:id/{receive,decide}` |
| Replenishment | `GET/POST /replenishment`, `POST /replenishment/:taskId/confirm` |
| Cycle Count | `GET /cycle-count`, `POST /cycle-count/schedule`, `POST /cycle-count/:taskId/submit` |
| Problem Tasks | `GET /problem-tasks`, `POST /problem-tasks/:id/{resolve,escalate}` |
| Audit | `GET /audit` |
| Devices | `GET/POST /devices`, `POST /devices/:id/heartbeat` |
| Hardware | `POST /hardware/{scan,weigh,print,photo,rfid}` (mock) |
| KPI | `GET /kpi/dashboard`, `GET /kpi/worker/:userId` |
| Supervisor | `GET /supervisor/{shift,problems}` |

## Складские процессы — реализовано

**Поставка:** `seller → POST /inbound/asn → POST /inbound/receive → авто-создание QC tasks → POST /inbound/qc/:taskId/decide → авто-создание PUTAWAY task → POST /inbound/putaway/:taskId/confirm → товар становится Available.`

**Заказ:** `POST /orders → POST /orders/:id/release → авто-резерв + авто-создание PICK task с авто-назначением → POST /picking/:taskId/scan → при последнем сканировании авто-PACK task → POST /packing/:taskId/confirm с проверкой веса → авто-LOAD task → POST /shipping/handoff → статус HANDED_TO_COURIER.`

**Возврат:** `POST /returns → POST /returns/:id/receive → POST /returns/:id/decide (RESELLABLE/REPACK_NEEDED/DAMAGED/...).`

**Task Engine:** статусы `Created → Assigned → Accepted → In Progress → {Waiting Scan, Waiting Supervisor, Blocked, Completed, Reassigned, Cancelled, Escalated}` с валидацией переходов через `packages/warehouse-core/status-machines.ts`.

## Hardware-ready architecture

Mock-сервисы под `/api/hardware/*` (scan, weigh, print, photo, rfid). API стабилен — реальные интеграции заменят реализацию, контракты не поменяются.

## Деплой

См. [README_DEPLOY.md](./README_DEPLOY.md) для пошаговой инструкции по Hostinger VPS.

## Этапы

| Этап | Что | Статус |
|---|---|---|
| 1 | Monorepo skeleton, packages, scaffolds | ✅ done |
| 2 | Backend API + Database + все 25 модулей + seed | ✅ done |
| 3 | Подключить Staff App к API (заменить mock на API client) | next |
| 4 | Полная Admin Panel (CRUD users/warehouses/zones/locations) | pending |
| 5 | Supervisor Panel (live shift view, reassign, resolve problems) | pending |
| 6 | Seller Portal + Courier Dispatch | pending |
| 7 | Deploy на Hostinger VPS (по README_DEPLOY.md) | ready |
| 8 | Build verification + production tuning | pending |
