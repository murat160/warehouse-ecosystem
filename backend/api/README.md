# @wms/api

Single backend for the entire ecosystem.

- **Stack:** Fastify 5 · Prisma 5 · SQLite (dev) / PostgreSQL (prod)
  · @fastify/jwt · zod · bcryptjs
- **Route on VPS:** `/api/`
- **Dev port:** 4000
- **DB:** owned exclusively by this service. No other app opens DB
  connections.

Module surface (see `src/modules/*`):

```
auth · users · roles · warehouses · zones · locations
products · skus · inventory
inbound (ASN+receiving+QC+putaway)
orders · tasks · picking · packing · shipping
returns · replenishment · cycle-count · problem-tasks
audit · devices · hardware · scans · kpi
supervisor                 ← shift-scoped aggregations
partner                    ← Partner API placeholder (Stage 6+)
```

For the full Partner API contract see
[/docs/PARTNER_API.md](../../docs/PARTNER_API.md).

For development rules see
[/docs/DEVELOPMENT_RULES.md](../../docs/DEVELOPMENT_RULES.md).
