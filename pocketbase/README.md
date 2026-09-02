# PocketBase setup

This app's data layer is a self-hosted [PocketBase](https://pocketbase.io) instance (currently `https://tune-frog.pockethost.io`, see `src/services/pocketbase.ts`). PocketBase has no separate "backend" to deploy - the collections and their API rules *are* the whole security model, the same way `firestore.rules` used to be for the Firebase version of this app.

## One-time setup on a fresh instance

1. Open your instance's Admin UI (`<your-instance-url>/_/`) and create a superuser account if you haven't already.
2. Go to **Settings → Import collections**.
3. Paste the contents of `schema.json` in this directory and import (merge, don't delete existing collections - the built-in `users` collection needs to stay).
4. That's it - this creates `classrooms`, `pcas`, `students`, and `serviceLogs`, adds a `role` field to `users`, and sets every collection's API rules.

`schema.json` was generated from a real PocketBase instance and round-trip verified: exported, re-imported into a fresh instance via the same import API the Admin UI uses, and re-tested against a suite of authorization tests (anonymous access, token scoping, token rotation, staff visibility, cross-classroom injection) - see the security model below for what those tests cover.

## Security model

There are three kinds of caller:

- **Approved staff** - a real (non-anonymous) account whose `users` record has `role` in `admin`/`teacher`/`pca`. These accounts can browse every classroom (matches the app's existing "any staff member can see any classroom" UI) and manage their own data.
- **An anonymous QR-code device** - no PocketBase auth at all. Every request instead carries `?token=<classroom's activeToken>` as a query parameter, which the collection rules check via `classroom.activeToken` (a relation-field lookup). Rotating a classroom's `activeToken` (the "Reset QR Codes" button) immediately revokes every outstanding QR code for that room - there is no separate session record to worry about invalidating.
- **Anyone else** (a `pending` account, an anonymous device with no or a stale token) - denied. PocketBase `list` calls return an empty page rather than throwing for a denied query (unlike Firestore, which rejects the whole request) - that's expected, not a bug, and every classroom-scoped collection filters this way.

`serviceLogs` creation additionally verifies that the referenced `pca` and `student` records actually belong to the `classroom` being logged against, so a request authorized for one classroom can't inject a log referencing another classroom's people.

## Bootstrap admin

Two email addresses (`renegml@nv.ccsd.net`, `mrenegar@gmail.com`, matching the original Firebase setup) are allowed to self-register with `role: "admin"` directly - see the `users` collection's `createRule` in `schema.json`. Everyone else who registers starts as `role: "pending"` until an admin promotes them from the Admin Dashboard.
