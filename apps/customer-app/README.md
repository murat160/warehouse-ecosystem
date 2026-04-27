# @wms/customer-app

End-customer storefront. Capacitor-ready PWA — same code ships to
Android and iOS.

- **Route on VPS:** `/customer/`
- **Dev port:** 5178
- **Audience:** registered customers (public registration allowed)
- **API:** relative `/api` (web) or `VITE_API_URL` (native build)

Scope: only own orders, addresses, returns, chat.

Functions: catalog, search, product detail, cart, checkout, address
book, order status, history, favourites, notifications, support chat,
returns, courier tracking.

For architecture rules see [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).
