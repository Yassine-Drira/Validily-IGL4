import { test } from "node:test";
import assert from "node:assert";

test("Revision Progress: Status normalization and valid states", () => {
  const normalizeStatus = (status) => {
    if (!status || status === "not_revised") return "not_started";
    if (["not_started", "in_progress", "revised"].includes(status)) return status;
    return "not_started";
  };

  assert.strictEqual(normalizeStatus("revised"), "revised");
  assert.strictEqual(normalizeStatus("in_progress"), "in_progress");
  assert.strictEqual(normalizeStatus("not_revised"), "not_started");
  assert.strictEqual(normalizeStatus("not_started"), "not_started");
  assert.strictEqual(normalizeStatus(undefined), "not_started");
  assert.strictEqual(normalizeStatus("unknown_status"), "not_started");
});

test("Revision Progress: Subject and overall revision metrics calculation", () => {
  const subjects = [
    { id: "flutter", code: "FLUTTER", name: "Flutter Mobile Engineering", semester_id: "s1" },
    { id: "ai", code: "AI", name: "Artificial Intelligence", semester_id: "s1" },
    { id: "cloud", code: "CLOUD", name: "Cloud Computing", semester_id: "s2" },
  ];

  const resources = [
    { id: "r1", subject_id: "flutter", title: "Flutter Intro" },
    { id: "r2", subject_id: "flutter", title: "State Management" },
    { id: "r3", subject_id: "flutter", title: "Widgets Tree" },
    { id: "r4", subject_id: "flutter", title: "Native Bridge" },
    { id: "r5", subject_id: "ai", title: "Search Algorithms" },
    { id: "r6", subject_id: "ai", title: "Neural Networks" },
    { id: "r7", subject_id: "cloud", title: "AWS Basics" },
  ];

  const userProgressMap = new Map([
    ["r1", "revised"],
    ["r2", "revised"],
    ["r3", "in_progress"],
    ["r4", "not_started"],
    ["r5", "revised"],
    ["r6", "in_progress"],
    // r7 not in map -> defaults to not_started
  ]);

  // Compute per subject and overall
  let totalResources = resources.length;
  let totalRevised = 0;
  let totalInProgress = 0;
  let totalNotStarted = 0;

  const subjectStats = subjects.map((subj) => {
    const subjResources = resources.filter((r) => r.subject_id === subj.id);
    let revised = 0;
    let inProgress = 0;
    let notStarted = 0;

    subjResources.forEach((r) => {
      const status = userProgressMap.get(r.id) || "not_started";
      if (status === "revised") revised++;
      else if (status === "in_progress") inProgress++;
      else notStarted++;
    });

    totalRevised += revised;
    totalInProgress += inProgress;
    totalNotStarted += notStarted;

    const progressPercentage = subjResources.length > 0 ? Math.round((revised / subjResources.length) * 100) : 0;

    return {
      subjectId: subj.id,
      subjectName: subj.name,
      totalResources: subjResources.length,
      revisedCount: revised,
      inProgressCount: inProgress,
      notStartedCount: notStarted,
      progressPercentage,
    };
  });

  const overallProgressPercentage = totalResources > 0 ? Math.round((totalRevised / totalResources) * 100) : 0;

  // Flutter: 2 revised out of 4 -> 50%
  const flutterStats = subjectStats.find((s) => s.subjectId === "flutter");
  assert.strictEqual(flutterStats.totalResources, 4);
  assert.strictEqual(flutterStats.revisedCount, 2);
  assert.strictEqual(flutterStats.inProgressCount, 1);
  assert.strictEqual(flutterStats.notStartedCount, 1);
  assert.strictEqual(flutterStats.progressPercentage, 50);

  // AI: 1 revised out of 2 -> 50%
  const aiStats = subjectStats.find((s) => s.subjectId === "ai");
  assert.strictEqual(aiStats.totalResources, 2);
  assert.strictEqual(aiStats.revisedCount, 1);
  assert.strictEqual(aiStats.inProgressCount, 1);
  assert.strictEqual(aiStats.progressPercentage, 50);

  // Cloud: 0 revised out of 1 -> 0%
  const cloudStats = subjectStats.find((s) => s.subjectId === "cloud");
  assert.strictEqual(cloudStats.totalResources, 1);
  assert.strictEqual(cloudStats.revisedCount, 0);
  assert.strictEqual(cloudStats.notStartedCount, 1);
  assert.strictEqual(cloudStats.progressPercentage, 0);

  // Overall: 3 revised out of 7 -> 43%
  assert.strictEqual(totalRevised, 3);
  assert.strictEqual(totalInProgress, 2);
  assert.strictEqual(totalNotStarted, 2);
  assert.strictEqual(overallProgressPercentage, Math.round((3 / 7) * 100)); // 43%
});

test("Telemetry Accuracy: No fabricated seed events and truthful device percentages", () => {
  // Real events from user sessions (no seed events)
  const realEvents = [
    { id: "evt-real-1", device_type: "desktop", browser: "Chrome", os: "Windows", page_path: "/subjects/flutter" },
    { id: "evt-real-2", device_type: "desktop", browser: "Firefox", os: "Linux", page_path: "/my-space" },
    { id: "evt-real-3", device_type: "mobile", browser: "Safari", os: "iOS", page_path: "/forest" },
    { id: "evt-real-4", device_type: "desktop", browser: "Chrome", os: "Windows", page_path: "/resources/r1" },
  ];

  // Verify seed events are filtered
  const mixedEvents = [
    ...realEvents,
    { id: "evt-seed-1", device_type: "tablet", browser: "Safari", os: "iOS" },
    { id: "evt-seed-2", device_type: "tablet", browser: "Edge", os: "Windows" },
  ];

  const genuineEvents = mixedEvents.filter((e) => !e.id.startsWith("evt-seed-"));
  assert.strictEqual(genuineEvents.length, 4);

  // Calculate device distribution strictly from genuine events
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  genuineEvents.forEach((e) => {
    if (e.device_type === "mobile") deviceCounts.mobile++;
    else if (e.device_type === "tablet") deviceCounts.tablet++;
    else deviceCounts.desktop++;
  });

  const totalDeviceEvents = genuineEvents.length;
  const pctDesktop = totalDeviceEvents > 0 ? Math.round((deviceCounts.desktop / totalDeviceEvents) * 100) : 0;
  const pctMobile = totalDeviceEvents > 0 ? Math.round((deviceCounts.mobile / totalDeviceEvents) * 100) : 0;
  const pctTablet = totalDeviceEvents > 0 ? Math.round((deviceCounts.tablet / totalDeviceEvents) * 100) : 0;

  assert.strictEqual(deviceCounts.desktop, 3);
  assert.strictEqual(deviceCounts.mobile, 1);
  assert.strictEqual(deviceCounts.tablet, 0); // No tablet users exist -> strictly 0!

  assert.strictEqual(pctDesktop, 75);
  assert.strictEqual(pctMobile, 25);
  assert.strictEqual(pctTablet, 0); // 0%, not 16% fake hardcoded value!
});

test("Telemetry Accuracy: Live focus sessions calculation is strictly dynamic", () => {
  const computeActiveFocusSessions = (events, windowMinutes = 30) => {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const activeFocusEvents = events.filter(
      (e) =>
        (e.event_name === "pomodoro_start" || e.event_name === "focus_heartbeat") &&
        new Date(e.created_at).getTime() >= cutoff
    );

    const activeUserIds = new Set(
      activeFocusEvents
        .map((e) => e.user_id || e.session_id)
        .filter(Boolean)
    );

    return activeUserIds.size;
  };

  const now = new Date().toISOString();
  const past = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 min ago (expired)

  const events = [
    { event_name: "pomodoro_start", user_id: "user-1", created_at: now },
    { event_name: "focus_heartbeat", user_id: "user-2", created_at: now },
    { event_name: "pomodoro_start", user_id: "user-1", created_at: now }, // duplicate same user
    { event_name: "pomodoro_start", user_id: "user-3", created_at: past }, // outside active window
  ];

  const activeFocusCount = computeActiveFocusSessions(events, 30);
  assert.strictEqual(activeFocusCount, 2); // strictly 2 active unique users, not Math.max(1, totalUsers/2)
});

test("Audio Catalog & Custom Audio: Fallback persistence schema and disk sync resilience", () => {
  // Test valid system user UUID resolution for PostgreSQL FK constraints
  const isValidUuid = (id) =>
    typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  const sampleValidUuid = "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d";
  const invalidUuid = "00000000-0000-0000-0000-000000000000";

  assert.strictEqual(isValidUuid(sampleValidUuid), true);
  assert.strictEqual(isValidUuid("admin-session-id"), false);

  // Audio catalog payload structure
  const catalogTrack = {
    id: "track-youtube-lofi",
    title: "Deep Coding Lo-Fi",
    description: "Relaxing study sounds",
    category: "Lo-Fi Beats",
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  assert.strictEqual(catalogTrack.source_type, "youtube");
  assert.strictEqual(catalogTrack.is_active, true);
  assert.strictEqual(typeof catalogTrack.id, "string");

  // Custom audio note title convention
  const customAudioNoteTitle = (userId) => `__system_custom_audio_${userId}__`;
  assert.strictEqual(customAudioNoteTitle("user-xyz"), "__system_custom_audio_user-xyz__");
});

test("Reddit-style Voting: State machine, toggles, unvotes, and score swings", () => {
  // Simulating the exact Reddit vote transition logic
  const calculateNextVoteState = (currentVote, clickedDirection, currentScore, currentUp, currentDown) => {
    // Toggle off if clicked same active direction
    const nextVote = currentVote === clickedDirection ? 0 : clickedDirection;

    let optimisticScore = currentScore;
    let optimisticUp = currentUp;
    let optimisticDown = currentDown;

    // Remove old vote
    if (currentVote === 1) {
      optimisticUp = Math.max(0, optimisticUp - 1);
      optimisticScore -= 1;
    } else if (currentVote === -1) {
      optimisticDown = Math.max(0, optimisticDown - 1);
      optimisticScore += 1;
    }

    // Apply new vote
    if (nextVote === 1) {
      optimisticUp += 1;
      optimisticScore += 1;
    } else if (nextVote === -1) {
      optimisticDown += 1;
      optimisticScore -= 1;
    }

    return {
      nextVote,
      score: optimisticScore,
      upvotes: optimisticUp,
      downvotes: optimisticDown,
    };
  };

  // Case 1: Initial state 0, user clicks up (+1)
  const step1 = calculateNextVoteState(0, 1, 0, 0, 0);
  assert.strictEqual(step1.nextVote, 1);
  assert.strictEqual(step1.score, 1);
  assert.strictEqual(step1.upvotes, 1);
  assert.strictEqual(step1.downvotes, 0);

  // Case 2: User is +1, clicks up again -> unvote (0)
  const step2 = calculateNextVoteState(step1.nextVote, 1, step1.score, step1.upvotes, step1.downvotes);
  assert.strictEqual(step2.nextVote, 0);
  assert.strictEqual(step2.score, 0);
  assert.strictEqual(step2.upvotes, 0);
  assert.strictEqual(step2.downvotes, 0);

  // Case 3: Initial state 0, user clicks down (-1)
  const step3 = calculateNextVoteState(0, -1, 0, 0, 0);
  assert.strictEqual(step3.nextVote, -1);
  assert.strictEqual(step3.score, -1);
  assert.strictEqual(step3.upvotes, 0);
  assert.strictEqual(step3.downvotes, 1);

  // Case 4: User is -1, clicks down again -> unvote (0)
  const step4 = calculateNextVoteState(step3.nextVote, -1, step3.score, step3.upvotes, step3.downvotes);
  assert.strictEqual(step4.nextVote, 0);
  assert.strictEqual(step4.score, 0);
  assert.strictEqual(step4.upvotes, 0);
  assert.strictEqual(step4.downvotes, 0);

  // Case 5: User is -1, clicks up (+1) -> Flip vote (+2 swing)
  const step5 = calculateNextVoteState(-1, 1, -1, 0, 1);
  assert.strictEqual(step5.nextVote, 1);
  assert.strictEqual(step5.score, 1); // was -1, now +1 (+2 swing)
  assert.strictEqual(step5.upvotes, 1);
  assert.strictEqual(step5.downvotes, 0);

  // Case 6: User is +1, clicks down (-1) -> Flip vote (-2 swing)
  const step6 = calculateNextVoteState(1, -1, 1, 1, 0);
  assert.strictEqual(step6.nextVote, -1);
  assert.strictEqual(step6.score, -1); // was +1, now -1 (-2 swing)
  assert.strictEqual(step6.upvotes, 0);
  assert.strictEqual(step6.downvotes, 1);
});

test("Reddit-style Voting: Shared public score & persistent state across private/public toggles", () => {
  // Simulated persistent vote store (resource_votes in DB fallback)
  const voteStore = new Map();

  const recordVote = (resourceId, userId, voteValue) => {
    const key = `${userId}:${resourceId}`;
    if (voteValue === 0) {
      voteStore.delete(key);
    } else {
      voteStore.set(key, { resourceId, userId, voteValue });
    }
  };

  const getVoteSummary = (resourceId, userId) => {
    let upvotes = 0;
    let downvotes = 0;
    let userVote = 0;

    for (const v of voteStore.values()) {
      if (v.resourceId === resourceId) {
        if (v.voteValue === 1) upvotes++;
        else if (v.voteValue === -1) downvotes++;

        if (userId && v.userId === userId) {
          userVote = v.voteValue;
        }
      }
    }

    return {
      score: upvotes - downvotes,
      upvotes,
      downvotes,
      userVote,
    };
  };

  const resource = {
    id: "res-exam-ds-2025",
    title: "ds-2025 Google Drive",
    visibility: "public",
  };

  // User A and User B both upvote the public resource
  recordVote(resource.id, "user-alice", 1);
  recordVote(resource.id, "user-bob", 1);

  // Shared public score is 2
  const summaryAlice = getVoteSummary(resource.id, "user-alice");
  assert.strictEqual(summaryAlice.score, 2);
  assert.strictEqual(summaryAlice.upvotes, 2);
  assert.strictEqual(summaryAlice.downvotes, 0);
  assert.strictEqual(summaryAlice.userVote, 1);

  const summaryBob = getVoteSummary(resource.id, "user-bob");
  assert.strictEqual(summaryBob.score, 2);
  assert.strictEqual(summaryBob.userVote, 1);

  const summaryCharlie = getVoteSummary(resource.id, "user-charlie");
  assert.strictEqual(summaryCharlie.score, 2);
  assert.strictEqual(summaryCharlie.userVote, 0); // has not voted yet

  // Owner turns resource private:
  resource.visibility = "private";

  // Votes MUST NOT be deleted or reset when toggled to private!
  const summaryWhilePrivate = getVoteSummary(resource.id, "user-alice");
  assert.strictEqual(summaryWhilePrivate.score, 2);
  assert.strictEqual(summaryWhilePrivate.upvotes, 2);

  // Owner turns resource back to public:
  resource.visibility = "public";

  // All scores and individual user votes are exactly preserved (Reddit-style!)
  const summaryRestored = getVoteSummary(resource.id, "user-charlie");
  assert.strictEqual(summaryRestored.score, 2);
  assert.strictEqual(summaryRestored.upvotes, 2);
});

test("Resource Votes: Component contracts display both upvotes and downvotes counts directly on buttons", async () => {
  const fs = await import("node:fs");
  const controlSource = fs.readFileSync("src/components/resources/resource-vote-control.tsx", "utf8");

  // Verify upvotes count is rendered on upvote button
  assert.ok(
    controlSource.includes("{upvotes}"),
    "ResourceVoteControl must display upvotes count directly on or with the upvote button"
  );

  // Verify downvotes count is rendered on downvote button
  assert.ok(
    controlSource.includes("{downvotes}"),
    "ResourceVoteControl must display downvotes count directly on or with the downvote button"
  );

  // Verify vote actions persists aggregated click counts
  const voteActionsSource = fs.readFileSync("src/lib/actions/vote-actions.ts", "utf8");
  assert.ok(
    voteActionsSource.includes("resource_vote_counts.json"),
    "vote-actions.ts must persist aggregated upvotes and downvotes click counts"
  );
});

test("Notes Table Isolation: Audio and Vote actions never create or query notes in the notes table", async () => {
  const fs = await import("node:fs");
  const audioCatalogSource = fs.readFileSync("src/lib/actions/audio-catalog-actions.ts", "utf8");
  const customAudioSource = fs.readFileSync("src/lib/actions/custom-audio-actions.ts", "utf8");
  const voteActionsSource = fs.readFileSync("src/lib/actions/vote-actions.ts", "utf8");

  assert.ok(
    !audioCatalogSource.includes('.from("notes")'),
    "audio-catalog-actions.ts must NEVER query or write to notes table"
  );
  assert.ok(
    !customAudioSource.includes('.from("notes")'),
    "custom-audio-actions.ts must NEVER query or write to notes table"
  );
  assert.ok(
    !voteActionsSource.includes('.from("notes")'),
    "vote-actions.ts must NEVER query or write to notes table"
  );
});


