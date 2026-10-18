---
name: secid-ops
description: Use when operating the SECiD production backend (Firebase project secid-org) from a coding assistant - reading or changing Auth users or Firestore documents, deleting or merging member accounts, verifying Cloud Functions triggers, checking a deploy, or deciding which actions belong to the owner instead of the assistant.
---

# SECiD ops

Beta (`feature/hub` → beta.secid.mx) and prod (`main` → secid.mx) share ONE
Firebase project, `secid-org`. Every write below hits production data.
Only `main` deploys the backend, and `main` changes only through a PR.

## Authenticate and call the APIs

```bash
TOK=$(gcloud auth print-access-token)   # account contacto@secid.mx; if it says
                                        # "Reauthentication failed" the OWNER runs
                                        # `gcloud auth login` (interactive)
H1="Authorization: Bearer $TOK"; H2="x-goog-user-project: secid-org"   # H2 is mandatory
FS="https://firestore.googleapis.com/v1/projects/secid-org/databases/(default)/documents"
IT="https://identitytoolkit.googleapis.com/v1/projects/secid-org"
curl -s -H "$H1" -H "$H2" "$FS/users/<uid>"                                  # read doc
curl -s -X POST -H "$H1" -H "$H2" -H "Content-Type: application/json" \
  "$IT/accounts:lookup" -d '{"localId":["<uid>"]}'                            # Auth record
curl -s -X POST -H "$H1" -H "$H2" -H "Content-Type: application/json" \
  "${FS}:listCollectionIds" -d '{}'                                           # NOTE ${FS}
curl -s -X DELETE -H "$H1" -H "$H2" "$FS/<collection>/<docId>"              # delete doc
curl -s -X POST -H "$H1" -H "$H2" -H "Content-Type: application/json" \
  "$IT/accounts:delete" -d '{"localId":"<uid>"}'                              # delete Auth user
curl -s -X POST -H "$H1" -H "$H2" -H "Content-Type: application/json" "${FS}:runQuery" \
  -d '{"structuredQuery":{"from":[{"collectionId":"applications","allDescendants":true}],
       "where":{"fieldFilter":{"field":{"fieldPath":"applicantId"},"op":"EQUAL",
       "value":{"stringValue":"<uid>"}}}}}'                                   # query / collection group
```

zsh gotcha: `"$FS:listCollectionIds"` is parsed as a modifier and silently
breaks the URL. Always write `"${FS}:..."`.

## What references a member

| Where | Key | Note |
| --- | --- | --- |
| Auth user | uid | deleting it fires gen1 `onUserDelete` |
| `users/{uid}` | uid | `onUserDelete` deletes it; subcollections do NOT cascade |
| `applications` (collection group) | `applicantId` | `onUserDelete` deletes them |
| `member_surveys/{uid}` | uid | delete by hand |
| `numero_cuenta_index/{numeroCuenta}` | field `uid` | delete ONLY if `uid` matches |
| `email_alias/{email}` | field `canonicalUid` | alias → canonical account; keep if it points elsewhere |
| `rbac_user_groups/{uid}` | uid | delete by hand if present |
| `users/{uid}/{activity,notifications,compensation,jobMatches}` | subcollections | list with `users/<uid>:listCollectionIds`, delete each doc |
| `connectionRequests`, `messages`, `conversations`, `companies`, … | uid fields | the full field map is `SIMPLE_COLLECTIONS` in `functions/src/merge-engine.ts`; query with `runQuery` |
| `merge_requests`, `archived_users` | `sourceUid`/`targetUid` | duplicate accounts go through the merge engine, not raw deletes |

Approve a membership = set the Estado dropdown to Activo in
`/es/dashboard/admin/members` (calls `updateMemberStatus`: lifecycle active,
role member, verificationStatus approved). Google Group sync fails until
issue #83 is solved; that is expected.

## Owner-only actions (ask, never work around)

IAM grants, `gh secret set`, `gh workflow run`, `gh pr merge`, budgets,
reCAPTCHA key updates, anything in Cloudflare DNS, the billing console,
Google Workspace admin. The owner runs these with the `!` prefix in the
Claude Code session. Deleting accounts needs the owner's explicit yes on a
listed inventory first.

## Recipes

| Need | Do |
| --- | --- |
| Verify `onUserDelete` without side effects | create a disabled Auth user with no `users` doc (`POST $IT/accounts` `{"email":…,"disabled":true}`), delete it, read `gcloud functions logs read onUserDelete --region us-central1` for `User data cleaned up` |
| Firestore backup before risky work | owner: `gh workflow run firestore-backup.yml --ref feature/hub -f label=<why>` (runbook `docs/runbooks/firestore-backup.md`) |
| Index just deployed | `GET $FS/../collectionGroups/<cg>/fields/<field>`; wait for `state: READY` (~4 min) |
| Prod deploy status | `gh run list --workflow=cd.yml --limit 1`; smoke test = `scripts/ci/smoke-test.sh https://secid.mx https://us-central1-secid-org.cloudfunctions.net` |
| Record what you did | `docs/LAUNCH-CHECKLIST.md`: account work under "Fase 5: limpieza", anything else under "Seguimiento post-lanzamiento" (checkbox + UTC time + what was touched); commit on `feature/hub` |

## Common mistakes

- Expecting `onUserDelete` to remove everything: it only clears `users/{uid}`
  and `applications`; the table above is the real list.
- Deleting `numero_cuenta_index/<n>` that belongs to another uid.
- Treating two Auth emails as "the same person" without the owner confirming.
- Running Firestore deletes before showing the owner the exact list.
- Pushing or merging to `main`: PR only, and the owner merges.

Deeper procedures: `docs/runbooks/prod-cutover.md`, `docs/runbooks/rollback.md`,
`docs/runbooks/billing-and-budget.md`, `docs/LAUNCH-CHECKLIST.md`.
