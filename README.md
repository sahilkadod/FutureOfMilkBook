# FutureOfMilkBook

A modern, offline-first dairy management app built with **React Native Community CLI** (not Expo).

## Project status

The React Native Community CLI app includes the original MilkBook screens and offline database flow. The website supports MilkBook account sign-in/sign-out, customer records, milk collection, monthly rates, bills, and browser backups. Website customer, milk, and rate changes use the same authenticated API as Android. The browser refreshes after saves, on focus, and every 15 seconds for the selected customer; Android refreshes shared data on resume and every 30 seconds while active.

## Preserved business requirements

- Customer records: name, phone, address and customer-wise history.
- Morning/evening milk quantity and fat entries by date.
- Monthly milk rates and customer-wise billing.
- Daily, monthly and yearly reports.
- Offline-first Android data entry with API sync, plus browser cache and JSON backup/restore.
- Display quantity and fat totals to one decimal place; use the label **Total fat**.

## Billing rule

The original MilkBook implementation calculates each session separately:

`bill = Σ(session litres × session fat × rate)`

Morning and evening amounts are added for each day, then summed for the month. Total fat and average fat are report values; average fat is not used to calculate the bill.

## Stack direction

- React Native Community CLI + TypeScript
- Native local SQLite through Nitro SQLite, using the audited MilkBook schema
- Website sessions use an HTTP-only cookie; the browser keeps a per-account cache and JSON backup/restore
- Both platforms use the authenticated MilkBook API as the shared source for customer, milk, and rate records
- Modern accessible UI with reusable design tokens

## Run

This repository is a source foundation, not a generated native React Native CLI project yet. To create the native Android/iOS folders, use the official React Native Community CLI environment setup and initialize the project with the agreed React Native version, then merge this source foundation.

Do not commit secrets. Use `.env.example` for documented variable names only.

## Next migration step

Review conflict handling for simultaneous edits and migrate any records that exist only in older browser backups.
