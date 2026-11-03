# MongoDB data model

MongoDB Atlas is the selected shared cloud database. The browser and Android clients must access it only through authenticated server APIs; neither client receives the Atlas connection string.

## Collections

- `customers`: owner-scoped customer identity and contact details; archived rather than hard-deleted.
- `milkEntries`: one customer/date reading record with morning/evening litres and fat.
- `monthlyRates`: one effective monthly rate per owner and calendar month.
- `billingAdjustments`: explicit, reasoned corrections to a customer billing period.
- `auditEvents`: append-only record of important data changes.

Every operational document has a stable client-generated `id`, an authenticated `userId`, timestamps and a monotonically increasing `version`. This supports offline creation and idempotent sync. The API must derive `userId` from the authenticated session; it must never trust a userId supplied in request JSON or query parameters.

## Indexes

The database adapter defines owner-scoped identifier uniqueness, customer list/phone indexes, customer/date milk-entry lookup, unique monthly rates, billing adjustment lookup and audit timelines. Index creation is an explicit setup operation, not an unguarded side effect on every request.

## Connection setup

1. Create a MongoDB Atlas cluster and a database user with least-privilege access.
2. Add the Atlas network access rule appropriate for the deployment. Avoid broad public access where possible.
3. Set `MONGODB_URI` and `MONGODB_DB_NAME` in Vercel project environment variables and local `.env.local`.
4. Run the controlled index setup after the credentials are configured.

No real credentials belong in GitHub. Authentication and owner authorization must be implemented before exposing customer or milk-entry API routes.
