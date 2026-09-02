<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Medicaid Time Tracker

A classroom PCA (Personal Care Assistant) service-time tracker for Medicaid billing, backed by a self-hosted [PocketBase](https://pocketbase.io) instance.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

The app talks to the PocketBase instance configured in `src/services/pocketbase.ts` (`POCKETBASE_URL`) - update that constant if you're pointing at a different instance.

## PocketBase setup

See [`pocketbase/README.md`](pocketbase/README.md) for the collection schema, API rules, and how to import them into a fresh instance.
