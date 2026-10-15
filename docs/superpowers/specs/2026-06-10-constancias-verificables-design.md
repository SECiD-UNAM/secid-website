# Constancias Verificables (Verifiable Certificates) — Design

**Date:** 2026-06-10
**Status:** Approved design, pending implementation plan
**Owner:** Artemio Padilla
**Related:** `secid-stationery` repo (offline document toolkit; SVG certificate design language this feature ports to the web)

## 1. Problem & Goal

SECiD issues constancias (participation, speaker, course, recognition, service) as standalone files (DOCX/SVG/PDF). Files are hard to verify, easy to forge, and their visual quality is constrained by the format. We want constancias that:

1. Live at a permanent URL on `secid.mx` → **verifiable evidence** (a recruiter can validate one in seconds, via link or QR).
2. Are rendered in HTML/CSS → **high visual quality** (web fonts, gradients, print stylesheet), exportable to PDF.
3. Are issued from the hub dashboard by authorized admins → no git/terminal knowledge required.

The `secid-stationery` repo remains the toolkit for offline/file documents (business cards, letterhead, invoices, decks, DOCX certificates). The web constancia lives entirely in this repo.

## 2. Decisions (settled with owner)

| Question                            | Decision                                                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static (versioned JSON) vs Firebase | **Full-web on Firebase** — leverages existing auth/Firestore/RBAC/Functions; single issuance system from day 1; instant emission and revocation.                                              |
| Privacy                             | **Public with link, not enumerable** — unguessable codes; Firestore `get` allowed, `list` denied; no public index.                                                                            |
| Issuance UX                         | Admin UI in the hub dashboard (single form + CSV batch import). Server-side callable function does the actual writes.                                                                         |
| PDF                                 | **Both**: print-CSS "Descargar PDF" button in v1; pre-generated PDF via Puppeteer function to Storage in fase 2.                                                                              |
| Palette                             | Site Tailwind palette (primary `#f65425`, secondary `#5b7f99`, gold `#fdb157`) — constancias are part of the site. `brand.json` (navy/orange) stays for stationery print docs.                |
| Supabase                            | A migration "sigue siendo un plan" (no repo evidence yet). Mitigation: **all constancia data access goes through a thin store layer** so a future Firestore→Supabase swap touches one module. |

### Key enabling fact (verified)

`cd.yml` (prod → secid.mx) and `deploy-beta.yml` (feature/hub → beta.secid.mx) use the **same Firebase project** (`secid-org`, same `STAGING_FIREBASE_*` secrets). Therefore: the admin issuance UI can ship on the beta hub while the public verification page ships on production `main`, reading the same Firestore — no need to wait for hub graduation.

## 3. Architecture

```
EMISSION (beta.secid.mx, auth + RBAC)
  Admin dashboard page → callable function `issueConstancias`
    → validates caller RBAC → generates codes + sha256 server-side
    → writes constancias/{code} docs + audit log entries

VERIFICATION (secid.mx, public, no auth)
  /constancias/?c=CODE → static Astro shell + client island
    → store.getConstancia(code) → render ConstanciaCard
    → states: loading / valid / revoked / not-found
```

### 3.1 Data model — `constancias/{code}` (Firestore)

```jsonc
{
  "code": "SECID-2026-X7K9Q4",   // doc id too. SECID-YYYY- + 6 chars Crockford base32 (no I/L/O/U)
  "recipient": "Jorge Alejandro Ramirez Bondi",
  "type": "participacion",        // participacion | ponente | curso | reconocimiento | servicio
  "achievement": "Taller de MLOps (12 horas)",
  "event": "Congreso SECiD 2026",
  "issuedAt": "2026-06-15",       // display date (string, es locale on page)
  "createdAt": <serverTimestamp>,
  "lang": "es",                   // document language; verification UI chrome is bilingual
  "signatory": { "name": "...", "title": "..." },
  "templateId": "v1",             // reserved for future template variants
  "revoked": false,
  "revokedReason": null,
  "sha256": "<hex>"               // hash of canonical payload (code|recipient|type|achievement|event|issuedAt)
}
```

Audit: `constancias_audit/{autoId}` — `{ action: "issue"|"revoke", code, actorUid, actorEmail, at }`. Written by the function only.

Zod schema in `src/types/constancia.ts`; shared by function (validation) and client (rendering).

### 3.2 Firestore rules

```
match /constancias/{code} {
  allow get: if true;       // public with link
  allow list: if false;     // not enumerable
  allow write: if false;    // only via Admin SDK in the function
}
match /constancias_audit/{id} {
  allow read, write: if false;   // function/console only
}
```

Append-only by construction: the function never updates issued docs except setting `revoked`/`revokedReason` (separate `revokeConstancia` callable, RBAC-gated). This + the displayed sha256 + the audit log is the integrity story replacing git history.

### 3.3 Store layer (Supabase insurance)

`src/lib/constancias/store.ts` — the **only** module that talks to the backend:

- `getConstancia(code: string): Promise<Constancia | null>` (client, public read)
- `issueConstancias(batch: NewConstancia[]): Promise<IssueResult>` (wraps the callable)
- `revokeConstancia(code: string, reason: string): Promise<void>` (wraps the callable)

UI components and pages import only from the store. A Supabase migration reimplements this file (table `constancias`, RLS: public `select` by exact PK, writes via RPC).

### 3.4 Issuance function — `functions/src/constancias.ts`

Callable `issueConstancias({ items, event })`:

1. Verify caller via RBAC (`constancias:create` — new resource added to `src/lib/rbac/types.ts`).
2. For each item: validate with Zod, generate code (retry on collision), compute sha256, build doc.
3. Batched write + audit entries. Return `{ issued: [{code, url}], errors: [...] }`.

Callable `revokeConstancia({ code, reason })`: RBAC `constancias:delete`; sets revoked fields; audit entry.

### 3.5 Admin UI — hub dashboard (beta)

`/es/dashboard/constancias/` (React island, follows DashboardHomePage patterns):

- Single-issue form (recipient, type, achievement, event, date, signatory presets).
- CSV batch import: parse client-side, preview table with per-row validation, confirm → one callable invocation; result screen lists URLs + copy-all button (to distribute to recipients).
- Issued tab: recent emissions (admin-only Firestore query via function or admin-only rules path — _implementation detail: a `listRecent` callable avoids loosening `list` rules_).
- Revoke action with reason, behind confirm dialog.

### 3.6 Verification page — production

`src/pages/constancias/index.astro` reading `?c=CODE` (see Routing below; page content renders in the constancia's `lang`, UI chrome bilingual):

- Static shell (SEO: generic OG card "Constancia verificada · SECiD" — recipient name is NOT in the static HTML).
- Client island fetches via store, renders:
  - **ConstanciaCard** — the document itself: site palette, display typography, inline SVG seal (ported from stationery `draw_seal`: ring style, monogram "S"), QR code (client-generated, points to its own URL), signatory block, code + sha256 footer.
  - **Verification band** above the card: ✓ Válida (issuedAt, event) / ⚠ Revocada (reason, still resolvable — never deleted) / ✗ No encontrada.
  - Buttons: **Imprimir / Guardar PDF** (`window.print()` + `@media print`: US-letter landscape, hides chrome, exact colors via `print-color-adjust`) and fase-2 **Descargar PDF** link.
- Unknown code → not-found state within the page (no 404 route needed; the shell is a single dynamic catch within `/constancias/`).

_Routing (decided):_ the site is `output: 'static'` on GitHub Pages, so arbitrary `/constancias/<code>` paths can only be served through the 404 fallback — which returns HTTP 404 and breaks link previews (LinkedIn's crawler treats the share as broken). Therefore:

- **Canonical URL (in QRs, share buttons, issuance output): `/constancias/?c=SECID-2026-X7K9Q4`** — a real static `src/pages/constancias/index.astro`, HTTP 200.
- **Convenience redirect:** the existing `src/pages/404.astro` gains a tiny client check — if the path matches `/constancias/<code>`, redirect to the canonical query URL. Pretty path-style links typed by hand still work; the canonical link is what gets distributed.

## 4. Phases

**v1 (this design):** data model + rules, issue/revoke functions, RBAC resource, store layer, verification page with ConstanciaCard + print CSS, admin dashboard page (form + CSV), bilingual UI strings.

**Fase 2 (specified, not built):** Puppeteer function generating PDF to Storage at issuance (`/constancias/{code}.pdf`), personalized OG images, per-event public index toggle (opt-in), GitHub-independent email delivery to recipients, stationery skill generating issuance CSVs.

**Out of scope:** payments, expiry dates (schema allows adding `expiresAt` later), migration of historical paper/DOCX constancias (can be back-issued via CSV when desired).

## 5. Testing

- Unit: code generator (alphabet, collisions), sha256 canonicalization, Zod schemas (vitest — existing setup).
- Rules: Firestore emulator tests — `get` allowed, `list` denied, client write denied.
- Function: emulator tests for RBAC rejection, batch issue, revoke.
- E2E (Playwright, existing setup): verification page states (valid/revoked/not-found) against emulator; print stylesheet smoke (page renders within one letter-landscape sheet).
- Visual: ConstanciaCard story/screenshot in the e2e pass.

## 6. Success criteria

1. An admin issues a batch of 50 constancias from the dashboard in under 5 minutes, receiving 50 shareable URLs.
2. Any of those URLs renders a beautiful constancia + ✓ Válida on secid.mx with no login, and prints to a clean one-page PDF.
3. Guessing/enumerating codes is infeasible; Firestore `list` is denied; revoked constancias show their state instead of disappearing.
4. No UI component imports Firebase directly — only the store layer does.
