# Custom Slug (Vanity URL) for Member Profiles

**Date:** 2026-03-22
**Status:** Approved

## Problem

Member slugs are auto-derived from `displayName` on every load via `slugify()` in `mapper.ts`. They are not persisted to Firestore, cannot be customized, have no uniqueness guarantee, and the slug lookup (`getMemberBySlug`) scans up to 200 profiles client-side.

## Solution

Persist a `slug` field on the Firestore user document. Let members set a custom vanity URL in their profile editor. Fix the slug lookup to use a Firestore indexed query.

## Changes

### Data Layer

- **Firestore `users` document**: add optional `slug: string` field.
- **`mapUserDocToMemberProfile()`** (`src/lib/members/mapper.ts`): use `data.slug || slugify(displayName)` — stored slug takes priority.
- **`getMemberBySlug()`** (`src/lib/members/queries.ts`): replace client-side scan with `where('slug', '==', slug)` Firestore query.
- **`getMemberProfile()`** (`src/lib/members/queries.ts`): fix the slug-vs-UID detection heuristic. Current `idOrSlug.includes('-')` breaks for hyphen-free custom slugs. New approach: attempt UID doc lookup first; if no doc found, fall back to slug query.
- **Firestore rules** (`firestore.rules`): add `'slug'` to the owner-update field allowlist.

### Validation

- **Format**: lowercase, alphanumeric + hyphens, 3–40 chars, no leading/trailing hyphens. Regex: `/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/`
- **Uniqueness**: query Firestore `where('slug', '==', candidate)` excluding current user's doc. Race condition (TOCTOU) accepted as low risk given user base size.
- **Reserved words**: block `admin`, `profile`, `dashboard`, `api`, `login`, `settings`, `members`, `cv`, `new`, `edit`, `search`, `blog`, `forum`, `events`, `mentorship`, `join`, `register`, `logout`, `en`, `es`.

### UI (ProfileEdit — Personal Tab)

- Add a "Custom URL" input field below the name fields in `PersonalTab`.
- Live preview showing `secid.org/{lang}/members/{slug}/cv`.
- Inline validation: format check on change, uniqueness check on blur (300ms debounce).
- If field is empty, show the auto-derived slug from displayName as placeholder.

### Save Flow

- Include `slug` in the `updateDoc()` call in `handleSave()`.
- If user clears the field, use `deleteField()` so the mapper falls back to `slugify(displayName)`. Avoids empty-string collisions in queries.

### Migration

- No backfill script needed. The `getMemberBySlug()` query will only match persisted slugs. For users who haven't set a custom slug, `getMemberProfile()` already handles UID-based lookups (the primary access path). The slug query is a secondary fallback used only for vanity URL resolution.

## Files to Modify

| File                                           | Change                                                |
| ---------------------------------------------- | ----------------------------------------------------- |
| `src/lib/members/mapper.ts`                    | Use stored slug with fallback                         |
| `src/lib/members/queries.ts`                   | Firestore indexed slug query + fix UID/slug heuristic |
| `src/components/profile/tabs/PersonalTab.tsx`  | Add slug input field                                  |
| `src/components/profile/profile-edit-types.ts` | Add `slug` to FormData                                |
| `src/components/profile/ProfileEdit.tsx`       | Include slug in save payload                          |
| `firestore.rules`                              | Add `'slug'` to owner-update allowlist                |

## Out of Scope

- Slug change history / redirects from old slugs
- Admin slug management
- Cloud Function enforcement of uniqueness (client-side query is sufficient for user base size)
- Backfill migration for existing users (fallback path handles this)
