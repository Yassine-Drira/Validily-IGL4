---
name: release-announcement
description: >-
  Mandatory release gate protocol for publishing in-app global product announcements
  and release notes to all registered VALIDILY-IGL4 users upon production releases.
---

# Product Release Announcement Protocol (Release Gate)

Every major or minor production release of VALIDILY-IGL4 must be accompanied by an in-app global announcement to ensure all registered students and teachers are informed of new features, optimizations, and community tools.

## 1. Zero-Quota Architectural Rules

To preserve Supabase free-tier storage and egress:
- **Never insert N rows for N users**: Do not write duplicate notification rows into the database for each user.
- **Single Registry Definition**: Register the announcement in `ACTIVE_GLOBAL_ANNOUNCEMENTS` within `src/lib/actions/notification-actions.ts` with a unique versioned ID (e.g. `announcement-v1-1-release`).
- **Isolated User State**: User read and dismissal status is tracked per-user via `getUserAnnouncementState(userId)` and persisted compactly in private state without table bloat.
- **Backward Compatibility**: Any newly registered user automatically receives the active broadcast upon first login until dismissed.

## 2. Content & Quality Guidelines

1. **Verified Features Only**:
   - Only announce features that have been tested and verified locally (`node --test tests/*.test.mjs` and `npx next build`).
   - Never announce hypothetical or unmerged roadmap items.
2. **Pillars of Value**:
   - Structure release notes into clear pillars (e.g., Resource Sharing, Formats, Community, Focus Hub, Gamification, Performance).
   - Use student-centric phrasing explaining how the feature helps their academic journey.
3. **Modal Presentation**:
   - Ensure `AnnouncementModal` renders the rich details with clear action CTAs (e.g., "Explorer mon espace").

## 3. Release Checklist

Before releasing a new version:
1. Verify feature correctness with local unit & integration tests.
2. Verify production build passes with `npx next build`.
3. Update `ACTIVE_GLOBAL_ANNOUNCEMENTS` in `src/lib/actions/notification-actions.ts` with the new version ID, release date, and content summary.
4. Ensure the modal pillars in `src/components/notifications/announcement-modal.tsx` reflect the verified release capabilities.
5. Deactivate or archive superseded release announcements by setting `is_active: false`.
6. Verify locally in the browser that the notification bell shows the new release badge and opens the announcement modal smoothly.
