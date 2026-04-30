# Deploy map — apps · URLs · domains · workflows

Single source of truth for **which folder ↔ which URL ↔ which subdomain**.
`deploy/nginx/wms.conf`, `deploy/deploy.sh` и каждый
`.github/workflows/deploy-*.yml` обязаны соответствовать этой таблице.

## 1. The 7-app canonical map

| # | Repo folder              | URL on VPS         | Future subdomain               | Workflow                       | Назначение                           |
|---|--------------------------|--------------------|--------------------------------|--------------------------------|--------------------------------------|
| 1 | `apps/customer-app`      | `/`                | `ehlitrend.com`                | `deploy-customer-app.yml`      | Покупатели                           |
| 2 | `apps/admin-panel`       | `/admin/`          | `admin.ehlitrend.com`          | `deploy-admin-panel.yml`       | Админ / Super Admin / менеджмент     |
| 3 | `apps/warehouse-app`     | `/warehouse/`      | `warehouse.ehlitrend.com`      | `deploy-warehouse-app.yml`     | Склад                                |
| 4 | `apps/courier-app`       | `/courier/`        | `courier.ehlitrend.com`        | `deploy-courier-app.yml`       | Курьер быстрой доставки              |
| 5 | `apps/pickup-point-app`  | `/pvz/`            | `pvz.ehlitrend.com`            | `deploy-pickup-point-app.yml`  | ПВЗ                                  |
| 6 | `apps/seller-app`        | `/partner/`        | `partner.ehlitrend.com`        | `deploy-seller-app.yml`        | Продавцы / партнёры                  |
| 7 | `apps/warehouse-courier-app` | `/warehouse-courier/` | `warehouse-courier.ehlitrend.com` | *(reserved, no folder yet)* | Складской курьер (маршруты со склада) |

API: `/api/` → backend (Fastify on `127.0.0.1:4000`) → future
`api.ehlitrend.com`.

Legacy paths still in the repo:
- `apps/staff-app` → `/staff/`
- `apps/supervisor-panel` → `/supervisor/`

These are NOT part of the 7-app canonical map. They keep their own
nginx blocks for now to avoid breaking anything that links to them.

## 2. Vite base path

When you run `npm --workspace apps/<name> run build`, **always pass
`--base=`** matching column 3 of the table:

```
admin-panel       → --base=/admin/
warehouse-app     → --base=/warehouse/
courier-app       → --base=/courier/
pickup-point-app  → --base=/pvz/
seller-app        → --base=/partner/
customer-app      → --base=/
```

Per-app GitHub workflows already pass the right `--base=` to
`npm run build`. `deploy/deploy.sh` does the same for the manual
"rebuild everything" path.

## 3. Workflow trigger rules

Each per-app workflow uses a `paths:` filter so a courier commit
**does not** run the admin deploy and vice-versa:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'apps/<this-app>/**'
      - '.github/workflows/deploy-<this-app>.yml'
      - 'deploy/nginx/wms.conf'         # nginx changes redeploy too
```

The aggregate `deploy.yml` is **manual-only** (`workflow_dispatch`)
since it rebuilds all 7 frontends — used for "rebuild from scratch"
after server moves.

## 4. nginx routing rules (must follow)

Two non-negotiable rules in `deploy/nginx/wms.conf`:

1. For every app there is **two** locations, in this order:
   ```nginx
   location ^~ /<path>/assets/ {
       alias /var/www/wms/apps/<folder>/dist/assets/;
       try_files $uri =404;
       expires 1y; access_log off;
       add_header Cache-Control "public, immutable";
   }
   location /<path>/ {
       alias /var/www/wms/apps/<folder>/dist/;
       try_files $uri $uri/ /<path>/index.html;
   }
   ```
   The `^~` prefix on `assets/` is critical: it stops any later
   regex location (`~* \.(js|css)$`) from stealing the JS/CSS
   request and stripping the `alias`. That mistake caused the
   2026-04-30 admin-panel white-screen incident.

2. The Customer App on `/` goes **last** — it's the catch-all SPA.
   Anything that didn't match a more specific prefix falls into it.
   Customer assets sit at `/assets/` (Vite `--base=/`), so we have
   `location ^~ /assets/` that points at customer's dist.

## 5. Per-app deploy self-test

Every workflow ends with a Step 3 that **must pass**:

- `curl http://127.0.0.1/<path>/`  →  HTTP 200 + `Content-Type: text/html`
- HEAD on the JS chunk parsed from `dist/index.html`  →  200 + `application/javascript`
- HEAD on the CSS chunk parsed from `dist/index.html`  →  200 + `text/css`

Any mismatch fails the workflow red. **Green ⇒ the URL really works**,
not just "the build finished".

Skeleton apps (`seller-app`, `customer-app` while their frontends
are not implemented yet) skip the assertion and only do a best-effort
HEAD on `/<path>/`.

## 6. Adding a new app — checklist

1. Pick a path in column 3, add a row to the table above.
2. Add a `build_app <folder> <base>` line to `deploy/deploy.sh`.
3. Add the two `location` blocks to `deploy/nginx/wms.conf` (the
   `^~ /<path>/assets/` block MUST be above any regex location).
4. Create `.github/workflows/deploy-<app>.yml` with `paths:` filter
   for that app's folder + the workflow file + `deploy/nginx/wms.conf`.
5. Push. The new workflow's Step 3 will tell you if `/<path>/` is
   really serving.
