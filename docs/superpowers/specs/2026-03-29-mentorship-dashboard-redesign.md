# Mentorship Dashboard Redesign

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Complete rebuild of mentorship dashboard — fix bugs, add missing features, elegant responsive UI

---

## Problem Statement

The mentorship feature has a working backend (Firebase services, types, matching algorithm) but a broken/incomplete frontend:

1. **404 Bug**: "Create Mentor/Mentee Profile" buttons navigate to `/dashboard/mentorship/browse` which doesn't exist (actual route is `/mentorship/browse`)
2. **No-op button**: MentorshipMatcher's "Create Profile" button has no onClick handler
3. **No mentee profile form**: Only MentorProfile.tsx exists — no way to create a mentee profile
4. **Monolithic component**: MentorshipDashboard.tsx is ~800 lines with all logic in one file
5. **Old CSS classes**: MentorProfile.tsx uses non-Tailwind CSS classes inconsistent with the rest of the dashboard
6. **Disconnected components**: MentorshipRequest.tsx and MentorshipSessions.tsx exist but are never mounted in any page

## Design Decisions

### Approach: Inline Tabs (Option A)

Profile creation and all mentorship workflows happen inside the dashboard via tabs. No new Astro routes needed. This was chosen over modals (awkward for long forms on mobile) and dedicated sub-pages (4 new Astro pages, navigation friction, loses dashboard context).

### Component Architecture

Break the monolithic dashboard into focused sub-components:

```
src/components/mentorship/
├── MentorshipDashboard.tsx        ← Orchestrator (~150 lines): tab state, data fetching, props distribution
├── MentorshipOverview.tsx         ← Stats cards + upcoming sessions + active matches summary
├── MentorshipMatches.tsx          ← Full matches list with status, actions, request management
├── MentorshipSessionsTab.tsx      ← Sessions list + scheduling (wraps existing MentorshipSessions)
├── MentorshipProfileTab.tsx       ← Role selection for new users, view/edit for existing profiles
├── MentorBrowseTab.tsx            ← Inline mentor discovery (wraps MentorshipMatcher)
├── MenteeProfileForm.tsx          ← NEW: mentee profile create/edit form
├── MentorProfile.tsx              ← REWRITE: convert from CSS classes to Tailwind
├── MentorshipMatcher.tsx          ← FIX: broken button → callback to switch to Profile tab
├── MentorshipRequest.tsx          ← Existing, wired into matches flow
├── MentorshipSessions.tsx         ← Existing, wired into sessions tab
└── shared/
    ├── MentorCard.tsx             ← Reusable avatar + info + status card
    ├── SessionCard.tsx            ← Reusable session item with type badge
    └── StatsCard.tsx              ← Stat card with value, label, trend indicator
```

### Data Flow

- **Orchestrator pattern**: MentorshipDashboard.tsx fetches all data on mount and distributes via props
- **Profile creation callback**: After creating a profile, orchestrator re-fetches all data → tabs update
- **Tab communication**: Child components call callbacks (e.g., `onSwitchTab('profile')`) for cross-tab navigation
- **Real-time**: Wire `subscribeMentorshipRequests` and `subscribeUpcomingSessions` from existing subscriptions.ts

### Responsive Design

| Breakpoint          | Stats Grid | Content Layout        | Tabs              | Touch            |
| ------------------- | ---------- | --------------------- | ----------------- | ---------------- |
| Mobile (<640px)     | 2×2        | Single column stacked | Horizontal scroll | 44px min targets |
| Tablet (640-1024px) | 2×2        | Single column         | Full labels       | Standard         |
| Desktop (1024px+)   | 4×1 row    | 2-column grid         | Full labels       | Standard         |

### Visual Design

- Follow existing dashboard patterns: `rounded-xl bg-white p-6 shadow dark:border dark:border-gray-700/30 dark:bg-gray-800`
- Brand colors: Primary (#f65425 Mandarina) for CTAs, Secondary (#5b7f99 Azul) for supporting elements
- Dark mode on all components
- Hover states: `hover:shadow-lg hover:-translate-y-1 transition-all`
- Tab active state: bottom border with primary color
- Avatar gradients: primary-to-accent for mentors, secondary-to-blue for mentees

## Components Specification

### 1. MentorshipDashboard.tsx (Orchestrator)

**Props**: None (gets user from AuthContext)

**State**:

- `activeTab`: `'overview' | 'matches' | 'sessions' | 'profile' | 'browse'`
- `mentorProfile`, `menteeProfile`: fetched profiles or null
- `matches`, `upcomingSessions`: arrays from Firebase
- `stats`: computed dashboard stats
- `loading`: boolean

**Behavior**:

- On mount: fetch mentor profile, mentee profile, matches, sessions, stats
- If no profiles exist: force `activeTab = 'profile'` to show onboarding
- Render tab bar + active tab content component
- Pass `onSwitchTab` callback to children for cross-tab navigation
- Pass `onProfileCreated` callback that triggers full data re-fetch

### 2. MentorshipOverview.tsx

**Props**: `stats`, `upcomingSessions`, `matches`, `mentorProfile`, `menteeProfile`, `onSwitchTab`

**Renders**:

- 4 StatsCards in responsive grid (active matches, completed sessions, next session, rating)
- "Upcoming Sessions" card with SessionCard items (max 3, "View all" links to sessions tab)
- "Active Matches" card with MentorCard items (max 3, "View all" links to matches tab)
- If no upcoming sessions: empty state with CTA to browse mentors

### 3. MentorshipProfileTab.tsx

**Props**: `mentorProfile`, `menteeProfile`, `userId`, `onProfileCreated`, `onProfileUpdated`

**Behavior**:

- **No profiles**: Show role selection cards (Become a Mentor / Find a Mentor / Both)
- **Selecting a role**: Inline renders MentorProfile (mode='create') or MenteeProfileForm
- **Has profile(s)**: Show profile view with "Edit" button, toggle between mentor/mentee if both exist
- **Edit mode**: Inline renders the form in edit mode
- After save: calls `onProfileCreated`/`onProfileUpdated` callback

### 4. MenteeProfileForm.tsx (NEW)

**Props**: `userId`, `mode: 'create' | 'edit'`, `onSave`, `onCancel`

**Form fields** (derived from MenteeProfile type):

- Display name, bio
- Goals (multi-select: Career Growth, Skill Development, Industry Transition, Academic Research, Entrepreneurship, Networking)
- Interests (from same EXPERTISE_AREAS list as mentor)
- Current level (student / entry / mid / senior)
- Preferred mentorship style (from same MENTORSHIP_STYLES list)
- Preferred frequency (weekly / biweekly / monthly)
- Availability (hours per week, preferred days, timezone, meeting times)
- Languages

**Validation**: Display name required, bio min 30 chars, at least 1 goal, at least 1 interest, level required

**Styling**: Tailwind, matching MentorProfile form pattern. Multi-step not needed — mentee form is shorter than mentor form.

### 5. MentorProfile.tsx (REWRITE)

Keep the same logic and form fields. Changes:

- Replace all CSS class names (`mentor-profile-view`, `profile-header`, `form-section`, etc.) with Tailwind utility classes
- Match the card/form patterns used across the dashboard
- View mode: elegant profile card with avatar, stats, expertise tags, availability grid
- Edit/Create mode: clean form sections with proper spacing, toggle chips for multi-select

### 6. MentorshipMatches.tsx

**Props**: `matches`, `mentorProfile`, `menteeProfile`, `onSwitchTab`

**Renders**:

- Tab/filter for: All / Active / Pending / Completed
- Match cards showing: partner info, match score, session count, status badge, last session date
- Actions per match: View sessions, Schedule session, Send message
- Pending requests section with accept/reject actions (uses existing MentorshipRequest in 'respond' mode)

### 7. MentorshipSessionsTab.tsx

**Props**: `sessions`, `matches`, `onSessionCreated`

**Renders**:

- Filter: Upcoming / Past / All
- Session cards with: title, partner, date/time, type badge, status
- "Schedule Session" button → inline form (wraps existing MentorshipSessions in 'create' mode)
- Empty state: "No sessions yet" with CTA

### 8. MentorBrowseTab.tsx

**Props**: `menteeProfile`, `onSwitchTab`

**Renders**:

- If no mentee profile: message + button to switch to profile tab
- If has mentee profile: renders MentorshipMatcher inline
- MentorshipMatcher fix: "Create Profile" button calls `onSwitchTab('profile')` instead of being a no-op

### 9. Shared Components

**StatsCard**: `{ label, value, trend?, trendLabel?, icon? }` → renders stat card with consistent styling
**MentorCard**: `{ profile, matchStatus?, sessionCount? }` → avatar + name + title + status badge
**SessionCard**: `{ session, partnerName }` → session info + type badge + time

## Bug Fixes Summary

| Bug                           | File                            | Fix                                                |
| ----------------------------- | ------------------------------- | -------------------------------------------------- |
| 404 on profile creation       | MentorshipDashboard.tsx:777,788 | Remove window.location.href; use inline tab switch |
| No-op create button           | MentorshipMatcher.tsx:564       | Add onClick → onSwitchTab('profile') callback      |
| Both buttons same destination | MentorshipDashboard.tsx:772-793 | Replaced by role selection cards in ProfileTab     |
| No mentee form                | —                               | New MenteeProfileForm.tsx                          |
| Old CSS classes               | MentorProfile.tsx               | Full Tailwind rewrite                              |

## Files Modified

- `src/components/mentorship/MentorshipDashboard.tsx` — Full rewrite as orchestrator
- `src/components/mentorship/MentorProfile.tsx` — Tailwind rewrite
- `src/components/mentorship/MentorshipMatcher.tsx` — Fix button, add onSwitchTab prop

## Files Created

- `src/components/mentorship/MentorshipOverview.tsx`
- `src/components/mentorship/MentorshipMatches.tsx`
- `src/components/mentorship/MentorshipSessionsTab.tsx`
- `src/components/mentorship/MentorshipProfileTab.tsx`
- `src/components/mentorship/MentorBrowseTab.tsx`
- `src/components/mentorship/MenteeProfileForm.tsx`
- `src/components/mentorship/shared/StatsCard.tsx`
- `src/components/mentorship/shared/MentorCard.tsx`
- `src/components/mentorship/shared/SessionCard.tsx`

## Files Unchanged

- `src/components/mentorship/MentorshipRequest.tsx` — Works as-is, mounted in matches tab
- `src/components/mentorship/MentorshipSessions.tsx` — Works as-is, mounted in sessions tab
- `src/lib/mentorship/*` — Backend layer is complete, no changes needed
- `src/types/mentorship.ts` — Types are comprehensive
- `src/pages/*/dashboard/mentorship/index.astro` — Wrapper pages stay the same
- `src/components/wrappers/MentorshipPage.tsx` — Stays the same

## Testing Strategy

- Verify profile creation flow for both mentor and mentee
- Verify tab navigation and cross-tab communication
- Verify responsive layouts at 375px, 768px, 1280px
- Verify dark mode on all components
- Verify existing MentorshipMatcher still works with new onSwitchTab prop
