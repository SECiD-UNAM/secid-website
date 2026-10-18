# Legacy data

This folder is `.gitignore`d (except `README.md` and `.gitignore`). Drop legacy
migration source files here:

- `member-survey.xlsx` — Google Forms export of the original member inscription survey

After dropping the file, run:

    node scripts/import-legacy-survey.mjs            # dry-run, shows what would change
    node scripts/import-legacy-survey.mjs --commit   # write to Firestore

The script:

1. Reads `member-survey.xlsx` (first sheet)
2. Indexes `/users` by email + alternate-email + display name
3. Matches each row to a user; writes to `member_surveys/{uid}` with
   `source: 'legacy-google-forms'` for traceability
4. Unmatched rows → `unmatched-report.csv` (also gitignored) for manual review

After the import, run `node scripts/seed-survey-aggregates.mjs` (or click
"Recalcular ahora" on `/es/dashboard/admin/survey`) to refresh the
`/survey_aggregates/{global,admin}` docs.
