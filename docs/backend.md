# Sticker Wall — Production Backend (Phase 5)

Prototype today is client-only (Zustand + `localStorage`). This doc is the production contract to implement next.

## Auth

- Magic link or OAuth (GitHub / Google)
- Required only at **Put on Wall** (checkout), not for free download
- Session on API; guest sticker drafts stay client-side until pay

## Storage

- Object store (R2 / S3) for sticker PNGs
- Public CDN URLs on `stickers.image_url`
- Virus / content scan on upload; reject NSFW via moderation queue

## Database schema (sketch)

```sql
users (
  id, email, name, created_at
)

products (
  id, user_id, name, one_liner, url, category, offer, created_at
)

stickers (
  id, user_id, product_id nullable, image_url, style, outline_color,
  outline_thickness, created_at
)

placements (
  id, sticker_id, product_id, x, y, width, height, z_index, size_tier,
  amount_cents, stripe_payment_id, created_at
)

reports (
  id, placement_id, reason, status, created_at
)
```

## Payments

- Stripe Checkout for S ($9) / M ($25) / L ($100)
- Webhook → create `placement` with next `z_index`
- No subscriptions; resurfacing = new placement purchase

## API surface (planned)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST   | `/api/stickers` | Upload processed PNG |
| GET    | `/api/wall` | Placements + sticker URLs (paginated / bbox) |
| POST   | `/api/checkout` | Start Stripe session for placement |
| POST   | `/api/webhooks/stripe` | Confirm pay → write placement |
| GET    | `/api/products` | Directory search |
| GET    | `/api/products/:id` | Product detail + placements |
| POST   | `/api/reports` | Report sticker |

## Moderation

- Upload allowlist: image mime + max size
- Manual report → hide placement (`status = hidden`) without deleting product
- Admin queue for review

## Visibility (later)

- Paint order by `z_index` is enough for v1
- Optional job: mark placements fully covered by newer rects; hide from wall render, keep in directory
