# Spec: Multi-Email Member Identity

**Status:** Proposed (not implemented)
**Author:** Forja
**Date:** 2026-05-17
**Related:** `functions/src/merge-engine.ts`, `src/lib/merge/mutations.ts`, `src/contexts/AuthContext.tsx`, `numero_cuenta_index`

## Problem

A member may have more than one email (e.g. UNAM email + personal email), or
may have accidentally created two accounts. The desired behavior:

> A member can log in with **either** email and get **the same full profile**.

The current system does **not** support this. The merge engine
(`onMergeRequestApproved`) is a **consolidation**: it migrates `sourceUid →
targetUid`, then archives/soft-deletes the source `users/{sourceUid}` and
**disables the source Firebase Auth user** (`admin.auth().updateUser(sourceUid,
{ disabled: true })`). After a merge only **one** email can log in. That is
correct for _deduping a throwaway duplicate_, but it is the opposite of
"use either email."

## Hard constraint

**Firebase Auth is single-email-per-user.** A Firebase user has one primary
email. You cannot attach two email/password credentials with different
addresses to one UID. Native provider linking only helps when the second
email arrives via a _different provider_ (Google/GitHub OAuth), which we
cannot assume for alumni who mostly use email/password.

Therefore "log in with either email, same profile" requires an **app-level
identity layer**, not a pure Firebase-Auth feature.

## Chosen model — Canonical identity + alias resolution

One **canonical** member document is the single source of truth. Any
additional Firebase Auth account the member uses is a thin **alias** that
resolves to the canonical profile. This is _additive_ — the rest of the app
keeps reading `userProfile` unchanged.

### Data model

| Path                                   | Shape                                        | Notes                                           |
| -------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| `users/{canonicalUid}`                 | full profile (existing)                      | numeroCuenta, role, tier, everything            |
| `users/{canonicalUid}.alternateEmails` | `{ email: string; verifiedAt: Timestamp }[]` | verified secondary emails                       |
| `users/{aliasUid}`                     | `{ aliasOf: canonicalUid }` (+ minimal stub) | created when a 2nd Auth account exists          |
| `email_alias/{emailLower}`             | `{ canonicalUid: string }`                   | resolution index; mirrors `numero_cuenta_index` |

`numeroCuenta` stays the strong real-world identity key — it is what SECiD
uses to decide "is this the same alum."

### Auth resolution (the only app-wide change)

In `AuthContext.subscribeToProfile`: after the first snapshot, if
`userProfile.aliasOf` is set, **transparently re-subscribe** to
`users/{aliasOf}` instead. One indirection; every consumer keeps reading
`userProfile`. Guard against alias→alias chains (resolve at most once;
reject/repair if `aliasOf` target also has `aliasOf`).

### Adding an alternate email (user-initiated, always verified)

1. In profile settings: "Add another email" → enter email B.
2. Send a verification link to email B (Cloud Function, signed token, TTL).
3. On click → callable verifies the token, appends `{ email, verifiedAt }`
   to `users/{canonicalUid}.alternateEmails`, writes
   `email_alias/{emailB}` → canonicalUid.
4. If email B already has its own Firebase Auth account: convert that
   account's `users/{uidB}` doc to a stub `{ aliasOf: canonicalUid }`
   (after migrating any data it owns — reuse the merge-engine migration,
   but with **action = alias instead of archive + disable**; do NOT disable
   the Auth user, since logging in with email B must keep working).

No silent linking. Matching `numeroCuenta` only _proposes_ a link; it never
auto-merges (someone can type your numeroCuenta).

### Reuse / change to the merge engine

`merge-engine.ts` gains an `action: 'alias'` alongside
`archive | soft-delete | hard-delete`:

- `alias`: run the existing source→target data migration, then set
  `users/{sourceUid} = { aliasOf: targetUid }`, write
  `email_alias/{sourceEmail}` → targetUid, append source email to
  `alternateEmails`, and **skip** the `auth().updateUser(disabled:true)`
  call. Keep `archive`/`hard-delete` for genuine throwaway dupes.

The merge-request UI (AdminMergeTool) gets an explicit action selector so an
admin chooses "consolidate (disable dupe)" vs "link as alternate email."

## Security considerations

- Alternate-email add **must** be ownership-proven (verification link), never
  derivable from a numeroCuenta match alone.
- `email_alias` is client-readable, server-write-only (like
  `numero_cuenta_index`): `allow read: if isAuthenticated(); allow write: if
false;`.
- Alias stub docs must not carry `isVerified`/`role`/`rbac` (read-through
  only) so a compromised alias can't self-escalate independent of the
  canonical doc.
- Resolution must reject cycles and missing canonical targets (fail closed:
  treat as no profile rather than loop).
- Audit every alias creation/removal in `rbac_audit_log`-style log.

## Out of scope / non-goals

- Native Firebase multi-provider linking (different model; revisit only if
  OAuth-only members become common).
- Self-service email **removal** (phase 2 — needs "can't remove last email"
  - re-auth).
- Automatic merge on numeroCuenta collision (always admin/owner-approved).

## Rollout

1. Add `email_alias` collection + rules (server-write-only).
2. Add `alias` action to merge-engine + AdminMergeTool selector.
3. Add `aliasOf` resolution in AuthContext (feature-flagged).
4. Add "Add another email" settings flow + verification callable.
5. Backfill: none required (additive; existing accounts unaffected).

## Open questions

- Which email is shown as "primary" in UI / used for outbound mail? Proposal:
  canonical doc keeps a `primaryEmail`; outbound always uses it.
- Should login with an alias email surface a one-time "you're signed in to
  your main SECiD profile" notice? Recommended yes (transparency).
