# Development rules

Short rules. Every entry is enforced — by code review, by CI greps, or by
both. If you have to break one, document why in the commit message.

---

## 1. Never duplicate apps

- One purpose → one app. If you find yourself copying `seller-app` to
  make a "BIM panel," stop and use [Partner API](./PARTNER_API.md).
- One backend. One database. No app-local DBs, no app-local
  `localStorage`-as-DB except UI cache.

## 2. API contract

- Web apps call **relative** `/api/...`. No `localhost`. No `127.0.0.1`.
  No `/api/api`. CI grep checks every commit.
- Mobile builds read `VITE_API_URL` at build time and produce a bundle
  with the absolute URL baked in — that's the only legitimate exception.
- Every app uses the shared `packages/api-client` (or its admin-panel
  thin wrapper at `apps/admin-panel/src/app/lib/api.ts`). Don't write
  raw `fetch` calls scattered across pages.

## 3. Versioned imports are a build error

The Figma Make export ships imports like:

```ts
import { Toaster } from 'sonner@2.0.3';
import('lucide-react@0.487.0');
```

These are **always** wrong. The mass-cleanup pattern is in commit
history; the rules:

- Static imports: `from 'pkg@x.y.z'` → `from 'pkg'`.
- Dynamic imports: `import('pkg@x.y.z')` → `import('pkg')`.
- React Router: always `react-router-dom`, never `react-router`
  (until the whole repo migrates to RR v7 in one PR).
- All deps live in the relevant `apps/*/package.json` or
  `packages/*/package.json`. Versions without `@version` in source.

## 4. Roles & permissions

- **Backend is the gate.** Frontend hides UI affordances; it never
  decides whether an action is allowed.
- Roles map: `SUPER_ADMIN`, `ADMIN`, `WAREHOUSE_MANAGER`,
  `SHIFT_SUPERVISOR`, role-per-task-type for staff
  (`PICKER`, `PACKER`, `QC_INSPECTOR`, …),
  `SELLER`, `COURIER_DISPATCHER`, `COURIER`, `PICKUP_OPERATOR`,
  `CUSTOMER`.
- Scope: Admin sees all. Supervisor sees own warehouse + shift. Picker
  sees only their tasks. Seller sees only their org. Courier sees only
  their deliveries. Customer sees only their orders.

## 5. Audit log

Every state-changing call writes one row:

```
{ userId, action, entity, entityId, payload, ipAddress, createdAt }
```

Required actions to log:

- login / logout / login.failed
- user create / update / delete / role change
- inventory adjust (manual override)
- ASN receive / QC decision
- putaway confirm
- pick scan / pack confirm / weight mismatch
- shipping handoff
- RMA create / receive / decide
- problem-task create / resolve / escalate
- failed scan (`/api/scans` returns ok=false)
- partner sync calls (Stage 6+)

## 6. Secrets

- `.env` is `.gitignore`-d. `.env.example` is committed.
- `JWT_SECRET` is generated with `openssl rand -hex 32` per environment.
- No token / PIN / password is ever passed to `console.log`.
- Stack traces are not exposed to the client; the API returns a
  human-readable code (`UNAUTHORIZED`, `WEIGHT_MISMATCH`, …) and a
  short message.

## 7. Operational safety

- Bad scan blocks the action and creates a problem-task.
- Weight mismatch (>±5%) blocks pack and creates a problem-task.
- Wrong SKU during picking blocks pick and creates a problem-task.
- Damaged item is moved to QC / Quarantine, not "Available".
- Manual inventory adjustment requires Admin/Supervisor and writes
  audit log with `reason`.

## 7.1 Numbered ground rules (the canonical list)

Stated explicitly so they can be cited verbatim in code review:

1.  **Don't mix apps.** Each app has one purpose, one path, one team-of-one.
2.  **Don't duplicate apps.** No `seller-app-bim`, no fork-per-customer.
3.  **Seller App supports modes A–E** (see [APPS.md §5](./APPS.md)) —
    small seller and large chain in one codebase.
4.  **Big chains plug in via Partner API**, not via a copied app.
5.  **One backend / one DB / one API.** All apps go through it.
6.  **Single VPS / single IP**, traffic split by URL path in nginx.
7.  **Subdomains later** are a nginx-only change. App code doesn't move.
8.  **Code is for the next maintainer.** Plain TS, predictable layout, no
    cleverness without a comment that explains why.
9.  **Every app has a README** pointing at `/docs`.
10. **Shared code lives in `packages/`** — `shared-types`, `api-client`,
    `ui`, `warehouse-core`. App-only code stays in the app.
11. **`package@version` imports are forbidden.** Static (`from 'sonner@2.0.3'`)
    and dynamic (`import('sonner@2.0.3')`) alike. CI greps for both.
12. **`localhost` and `127.0.0.1` are forbidden in `apps/*/src`.** Vite's
    dev-only proxy target may live in `vite.config.ts`; that's the single
    legitimate exception.
13. **`/api/api` is a bug.** All client calls are relative `/api/...`.
14. **All changes ship via GitHub.** No manual file copy to the VPS, no
    "I'll edit it on the server real quick", no SSH-only fixes.
15. **The VPS only pulls.** `./deploy/deploy.sh` runs `git reset --hard
    origin/main` + build + reload. If a change isn't in `origin/main`,
    it doesn't exist.

---

## 8. Static checks before every commit

```bash
grep -R "sonner@"          -n apps/   ;# must be 0
grep -R "@2.0.3"           -n apps/   ;# must be 0
grep -R "localhost"        -n apps/*/src ;# must be 0 (vite.config dev-only is OK)
grep -R "127.0.0.1"        -n apps/*/src ;# must be 0
grep -R "/api/api"         -n apps/   ;# must be 0
grep -R "from 'react-router'" -n apps/ ;# must be 0
```

CI (and the deploy script on the VPS) are allowed to fail the build on
any non-zero result.

## 9. Adding a new app

Open a single PR that does **all** of these:

1. `apps/<new-app>/` with `package.json`, `vite.config.ts` (port 5180+,
   `/api` proxy), `tsconfig.json` extending base, `index.html`,
   `src/main.tsx`, `src/App.tsx`, `README.md`.
2. Root `package.json`: add `dev:<x>` and `build:<x>` scripts and
   include them in `dev`/`build:apps`.
3. `deploy/deploy.sh`: add `build_app <new-app> /<path>/`.
4. `deploy/nginx/wms.conf` + `wms.docker.conf`: add `location /<path>/`.
5. `deploy/Dockerfile.web`: add the `RUN vite build --base=/<path>/`
   line and the `COPY --from=builder ... /usr/share/nginx/html/<path>`.
6. `docs/APPS.md`: add a row to the table and a section.
7. `README.md` and `README_DEPLOY.md`: add the new URL to the lists.

If any of those steps is missing the PR is incomplete.

## 10. Adding a new backend module

1. `backend/api/src/modules/<x>/routes.ts` with Zod schemas.
2. Register it in `server.ts` under `/api/<x>`.
3. Add to `docs/ARCHITECTURE.md` § Backend modules.
4. If it changes the DB: `prisma/schema.prisma` migration + seed update.
5. If it logs auditable actions: write `audit({...})`. Always.
