# FutureOfMilkBook architecture

## Product direction

FutureOfMilkBook will support:
- Android app built with React Native Community CLI.
- Responsive web application accessible from modern desktop and mobile browsers.
- One authenticated dairy account with shared data across devices.

## Target architecture

```text
React Native app          Next.js web app
       |                         |
       +------ HTTPS API --------+
                    |
             Node.js backend
          Authentication / RBAC
          Validation / business rules
                    |
             MongoDB database
                    |
           Sync + audit metadata

Mobile local SQLite database
       | offline queue / sync
       +------ HTTPS API
```

## Data ownership and synchronization

- The server is the shared source of truth for cross-device access.
- The mobile app keeps a local SQLite store for offline entry.
- Web operations use the authenticated API; they must not connect directly to the database.
- Every mutable record needs a stable ID, owner/tenant scope, created/updated timestamps and a sync/version strategy.
- Sync must be idempotent and handle conflicts explicitly; never silently overwrite newer server data.
- Authentication tokens and secrets must not be committed to Git.

## Domain modules

1. Customers and customer status.
2. Milk entries: date, morning litres/fat, evening litres/fat.
3. Monthly effective rates.
4. Billing statements and adjustments.
5. Daily/monthly/yearly reports.
6. Backup, restore, audit history and synchronization.

## Billing compatibility

The legacy calculation supplied during planning is:

`amount = totalMilk * (totalFat / (sessionCount * 2)) * rate`

The existing MilkBook implementation and actual statements must be audited before this becomes the authoritative server-side calculation. Rounding rules, missing sessions, zero-litre readings, rate effective dates and historical corrections require explicit tests.

## Security requirements

- Per-user data isolation enforced by the backend on every request.
- Password/OTP authentication and refresh-token lifecycle to be designed before production.
- TLS only; secrets stored in deployment environment variables.
- Input validation, authorization checks, audit logging, rate limiting and backups.
- No production data or credentials in the repository.

## Current implementation status

The web directory contains a responsive dashboard UI preview. It uses placeholder values and does not yet have authentication, API calls, persistence or real-time sync. The mobile root contains an initial UI shell and a provisional calculation function. This is not a production-ready full-stack system.

## Current build sequence

The new application is being developed as a clean implementation; the previous MilkBook repository is not being connected or modified. Build the shared domain contracts first, then add the authenticated API and database adapter, followed by browser CRUD screens and the mobile SQLite adapter. Before production billing, explicitly confirm rounding, missing-session handling, effective rate dates and historical corrections against the owner's business rules.
