# Partner API

For external retail networks (e.g. BIM, Biedronka, supermarket chains)
that already run their own ERP / mobile apps and want to plug into the
ecosystem without using `seller-app`.

**Status: surface reserved, endpoints stubbed (501 Not Implemented).**
The contract below is stable. Implementations land in Stage 6+ without
breaking integrators.

---

## 1. Authentication

Every request **must** carry an opaque API key in a header:

```
X-Partner-Key: <key>
```

- Keys are issued by Super Admin via the admin panel
  (`/admin/partner/keys` — coming in Stage 6) or via CLI in the meantime.
- A key is bound to one `Partner` record (organization-level; not per
  branch). The same key may have one or many associated branches.
- Keys can be revoked instantly. A revoked key returns
  `401 PARTNER_KEY_REVOKED`.
- Keys are **never** mixed with user JWTs. The auth middlewares are
  separate, so a leaked partner key cannot impersonate a human user
  and vice-versa.

A healthcheck endpoint is provided so integrators can confirm the key
works before wiring further calls:

```
GET /api/partner/health        →  200 { ok: true, partner: "...", apiVersion: "v0" }
```

---

## 2. Data model (planned tables)

| Table                   | Purpose                                                  |
|-------------------------|----------------------------------------------------------|
| `Partner`               | one row per chain. name, billing email, status.          |
| `PartnerApiKey`         | hashed key, partnerId, scopes, lastUsedAt, revokedAt     |
| `PartnerWebhook`        | partnerId, event, url, secret, retryPolicy               |
| `MerchantOrganization`  | partnerId, displayName, vat, country                     |
| `MerchantBranch`        | orgId, externalId, name, address, lat/lng                |
| `MerchantWarehouse`     | orgId, externalId, name, address                         |
| `BranchInventory`       | branchId, skuId, qty, reserved, updatedAt                |
| `BranchOrderRouting`    | rules: which branch fulfils which delivery zone          |

`externalId` lets the partner address rows by their own IDs.

---

## 3. Endpoints

All endpoints are POST + JSON unless noted. Auth: `X-Partner-Key`.

### 3.1 Catalog sync

```
POST /api/partner/products/sync
{
  "products": [
    {
      "externalId": "P-12345",
      "name": "Cotton Tee",
      "brand": "Acme",
      "category": "T-Shirt",
      "skus": [
        { "externalId": "S-12345-BL-M", "barcode": "8690000…",
          "color": "Black", "size": "M", "weightKg": 0.25 }
      ]
    }
  ]
}
→ 200 { synced: 1, created: 1, updated: 0, errors: [] }
```

### 3.2 Inventory sync

```
POST /api/partner/inventory/sync
{
  "branchExternalId": "B-001",
  "items": [
    { "skuExternalId": "S-12345-BL-M", "qty": 84 }
  ]
}
→ 200 { synced: 1 }
```

### 3.3 Branch sync

```
POST /api/partner/branches/sync
{
  "branches": [
    { "externalId": "B-001", "name": "Warsaw Centrum",
      "address": "...", "lat": 52.23, "lng": 21.01 }
  ]
}
→ 200 { synced: 1 }
```

### 3.4 Order flow

When a customer places an order routed to a partner branch, the platform
calls **the partner**'s webhook (registered via 3.6). The partner replies
synchronously with one of:

```
POST <partner-webhook>/order
{ "orderId": "ORD-2026-00001", "branchExternalId": "B-001", "items": [...] }
→ 200 { accepted: true, partnerOrderId: "P-ORD-9999" }
```

Subsequent status updates flow back into the platform:

```
POST /api/partner/orders/status
{ "orderId": "ORD-2026-00001", "status": "PICKING" | "READY" | "HANDED_OFF" |
                                          "FAILED" | "CANCELLED",
  "note": "optional", "occurredAt": "ISO-8601" }
→ 200 { ok: true }
```

### 3.5 Returns

```
POST /api/partner/returns/status
{ "rmaId": "RMA-2026-00001", "decision":
    "RESELLABLE" | "REPACK_NEEDED" | "DAMAGED" |
    "RETURN_TO_SELLER" | "DISPUTE" | "DISPOSAL",
  "note": "optional" }
→ 200 { ok: true }
```

### 3.6 Webhook subscription

```
POST /api/partner/webhooks/register
{ "event": "order.created" | "order.updated" | "delivery.completed" | ...,
  "url": "https://partner.example.com/hooks/wms",
  "secret": "shared-secret-for-HMAC" }
→ 200 { id: "wh_…", verified: false }
```

The platform sends an HMAC-SHA256 of the body in `X-WMS-Signature`.
Partners verify with their `secret`.

---

## 4. Rate limits & idempotency

- 100 req/min/key by default; configurable per partner.
- All write endpoints accept an optional `Idempotency-Key` header. The
  platform stores the response for 24 hours and replays it on retry.
- Webhook deliveries retry with exponential backoff
  (5s, 30s, 5m, 30m, 2h, 6h) before being parked for manual replay.

---

## 5. Versioning

The current surface is `v0`. When a breaking change ships, a parallel
prefix `/api/partner/v1/...` is added; `v0` keeps working for at least
6 months.

---

## 6. Don'ts for integrators

- ❌ Don't poll. Use webhooks.
- ❌ Don't bypass `externalId` and try to use platform UUIDs. UUIDs change
  on re-import; `externalId` is your stable handle.
- ❌ Don't share an API key between branches. Use one key per partner;
  scope by `branchExternalId` in the payload.
- ❌ Don't wrap the partner key in any client-visible code. It belongs on
  your servers only.
