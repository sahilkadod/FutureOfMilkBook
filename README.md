# FutureOfMilkBook

A modern, offline-first dairy management app built with **React Native Community CLI** (not Expo).

## Project status

This repository currently contains the first application foundation. It is **not yet a complete migration** of the original MilkBook app. The original source project must be reviewed before replacing its database, screens, or sync behavior.

## Preserved business requirements

- Customer records: name, phone, address and customer-wise history.
- Morning/evening milk quantity and fat entries by date.
- Monthly milk rates and customer-wise billing.
- Daily, monthly and yearly reports.
- Offline-first data entry, backup/restore and a future sync layer.
- Display quantity and fat totals to one decimal place; use the label **Total fat**.

## Billing rule

The legacy rule supplied for MilkBook is:

`bill = totalMilk × (totalFat ÷ (sessionCount × 2)) × rate`

For two sessions, `sessionCount = 2`. Confirm this rule against the original implementation and real dairy statements before production billing.

## Stack direction

- React Native Community CLI + TypeScript
- Local SQLite database (adapter and migrations to be selected after auditing the existing MilkBook database)
- Offline-first repository layer, followed by a separately designed API/sync service
- Modern accessible UI with reusable design tokens

## Run

This repository is a source foundation, not a generated native React Native CLI project yet. To create the native Android/iOS folders, use the official React Native Community CLI environment setup and initialize the project with the agreed React Native version, then merge this source foundation.

Do not commit secrets. Use `.env.example` for documented variable names only.

## Next migration step

Upload the existing `MilkBook` project as a ZIP (exclude `node_modules`, Gradle caches, build outputs and APKs). We need to inspect the real navigation, SQLite schema, calculations, and Android configuration before implementing a safe migration.
