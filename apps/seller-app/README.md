# @wms/seller-app

Merchant / seller app. **Same app for both:**

- **Mode A — small seller / single store**
- **Mode B — chain HQ** with `MerchantOrganization` + many `MerchantBranch`

Big chains (BIM-style) that already have their own ERP **don't fork
this app** — they integrate via the [Partner API](../../docs/PARTNER_API.md).

- **Route on VPS:** `/seller/`
- **Dev port:** 5176
- **Audience:** `SELLER` role; users belonging to a `MerchantOrganization`
- **API:** relative `/api` only (own data only — backend enforces scope)

Functions: org profile, branches/stores, employees, products/SKU,
prices, branch-level inventory, orders, returns, ASN/shipments,
documents, QC issues, reports, support.

For architecture rules see [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).
