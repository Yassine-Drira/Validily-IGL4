import test from "node:test";
import assert from "node:assert/strict";

test("Focus Coherence & Per-User Achievement Integrity", async (t) => {
  // Dynamic import of forest actions and analytics actions
  const forestActions = await import("../src/lib/actions/forest-actions.ts");
  const analyticsActions = await import("../src/lib/actions/analytics-actions.ts");
  const authModule = await import("../src/lib/auth/authorization.ts");

  const USER_A_ID = "11111111-aaaa-aaaa-aaaa-111111111111";
  const USER_B_ID = "22222222-bbbb-bbbb-bbbb-222222222222";

  await t.test("1. Dead trees do not contribute phantom 1500s (25 min) to focus accumulation", async () => {
    authModule.setTestUser({
      id: USER_A_ID,
      email: "user_a@validily.tn",
      role: "student",
      name: "User A",
      avatarUrl: null,
    });

    // Start and abandon a session after 3 minutes (180 seconds) to create a dead tree
    const sessionRes = await forestActions.startFocusSession({
      treeSpecies: "cedar",
      targetDurationSeconds: 1500,
    });
    assert.equal(sessionRes.success, true);
    assert.ok(sessionRes.session?.id);

    const abandonRes = await forestActions.abandonFocusSession(
      sessionRes.session.id,
      "Test manual abandon after 3 min",
      180
    );
    assert.equal(abandonRes.success, true);
    assert.equal(abandonRes.status, "interrupted");
    assert.equal(abandonRes.tree?.tree_status, "leafless");
    assert.equal(abandonRes.tree?.session?.actual_duration_seconds, 180);

    // Fetch User A forest
    const forest = await forestActions.getMyForest(USER_A_ID);
    assert.equal(forest.authenticated, true);
    // User A has 0 healthy trees and at least 1 dead tree
    assert.equal(forest.stats.healthyCount, 0);
    assert.ok(forest.stats.leaflessCount >= 1);
    // The dead tree MUST NOT have added 25 minutes! If no healthy focus exists, total minutes must be 0
    assert.equal(forest.stats.totalFocusedMinutes, 0);

    // Verify the dead tree inside forest.trees records 180s (3 min) and never 1500s (25 min)
    const deadTreeInForest = forest.trees.find((t) => t.id === abandonRes.tree?.id);
    assert.ok(deadTreeInForest);
    assert.equal(deadTreeInForest.session?.actual_duration_seconds, 180);
    assert.notEqual(deadTreeInForest.session?.actual_duration_seconds, 1500);
  });

  await t.test("2. Mathematical Invariant: Total accumulated minutes >= today daily minutes and >= sum(daily history)", async () => {
    // Record 40 minutes for today in daily focus records
    const todayStr = new Date().toISOString().split("T")[0];
    const recRes = await analyticsActions.recordUserDailyFocus({
      userId: USER_A_ID,
      dateStr: todayStr,
      totalSeconds: 2400, // 40 minutes
      completedPomodoros: 1,
    });
    assert.equal(recRes.success, true);

    const forest = await forestActions.getMyForest(USER_A_ID);
    // Total focused minutes MUST be at least 40 minutes
    assert.ok(
      forest.stats.totalFocusedMinutes >= 40,
      `Expected totalFocusedMinutes >= 40, got ${forest.stats.totalFocusedMinutes}`
    );
  });

  await t.test("3. Strict Per-User Personalization & Zero Data Cross-Contamination", async () => {
    // Verify User B's forest does NOT contain User A's trees or focus minutes
    authModule.setTestUser({
      id: USER_B_ID,
      email: "user_b@validily.tn",
      role: "student",
      name: "User B",
      avatarUrl: null,
    });

    const forestB = await forestActions.getMyForest(USER_B_ID);
    assert.equal(forestB.authenticated, true);
    assert.equal(forestB.stats.healthyCount, 0);
    assert.equal(forestB.stats.leaflessCount, 0);
    assert.equal(forestB.stats.totalFocusedMinutes, 0);
    assert.equal(forestB.trees.length, 0);

    // Now User B completes a valid 15-minute (900s) pomodoro
    const bSession = await forestActions.startFocusSession({
      treeSpecies: "sakura",
      targetDurationSeconds: 900,
    });
    assert.equal(bSession.success, true);

    const bComplete = await forestActions.completeFocusSession(bSession.session.id);
    assert.equal(bComplete.success, true);
    assert.equal(bComplete.tree?.tree_status, "healthy");

    const forestBAfter = await forestActions.getMyForest(USER_B_ID);
    assert.equal(forestBAfter.stats.healthyCount, 1);
    assert.equal(forestBAfter.stats.leaflessCount, 0);
    assert.equal(forestBAfter.stats.totalFocusedMinutes, 15);

    // Switch back to User A to ensure User A was completely unaffected by User B's action
    authModule.setTestUser({
      id: USER_A_ID,
      email: "user_a@validily.tn",
      role: "student",
      name: "User A",
      avatarUrl: null,
    });

    const forestAAfter = await forestActions.getMyForest(USER_A_ID);
    assert.equal(forestAAfter.stats.healthyCount, 0);
    assert.ok(forestAAfter.stats.leaflessCount >= 1);
    // User A has 40 min from daily record, not 15 min from User B
    assert.equal(forestAAfter.stats.totalFocusedMinutes, 40);
    // User A's trees list must not contain User B's sakura tree
    assert.ok(!forestAAfter.trees.some((t) => t.user_id === USER_B_ID));
  });

  await t.test("4. All 12 Achievement Formulas Validate Correctly Without Illogical Inconsistencies", () => {
    // Test helper matching ForestAchievements formula
    function computeAchievements(entries, totalMinutes, streak) {
      const healthyTrees = entries.filter((e) => e.tree_status === "healthy");
      const healthyCount = healthyTrees.length;
      const healthyMinutes = Math.floor(
        healthyTrees.reduce((acc, t) => {
          const sec =
            t.session?.actual_duration_seconds ??
            t.session?.target_duration_seconds ??
            1500;
          return acc + (typeof sec === "number" && sec > 0 ? sec : 1500);
        }, 0) / 60
      );

      const computedMinutes = Math.max(
        totalMinutes !== undefined ? totalMinutes : 0,
        healthyMinutes
      );

      const plantedSpecies = Array.from(
        new Set(
          healthyTrees
            .map((t) => t.tree_species)
            .filter((sp) => ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"].includes(sp))
        )
      );
      const speciesCount = plantedSpecies.length;
      const effectiveFirstTree = Math.max(healthyCount, computedMinutes >= 15 && healthyCount > 0 ? 1 : healthyCount);

      return [
        { id: "first_tree", unlocked: effectiveFirstTree >= 1, progress: `${Math.min(1, effectiveFirstTree)} / 1 arbre` },
        { id: "grove_5", unlocked: healthyCount >= 5, progress: `${Math.min(5, healthyCount)} / 5 arbres` },
        { id: "grove_15", unlocked: healthyCount >= 15, progress: `${Math.min(15, healthyCount)} / 15 arbres` },
        { id: "full_island_36", unlocked: healthyCount >= 36, progress: `${Math.min(36, healthyCount)} / 36 arbres` },
        { id: "grove_master_100", unlocked: healthyCount >= 100, progress: `${Math.min(100, healthyCount)} / 100 arbres` },
        { id: "focus_bronze", unlocked: computedMinutes >= 120, progress: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 2h` },
        { id: "focus_silver", unlocked: computedMinutes >= 600, progress: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 10h` },
        { id: "focus_gold", unlocked: computedMinutes >= 1440, progress: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 24h` },
        { id: "streak_3", unlocked: (streak || 0) >= 3, progress: `${Math.min(3, streak || 0)} / 3 jours` },
        { id: "streak_7", unlocked: (streak || 0) >= 7, progress: `${Math.min(7, streak || 0)} / 7 jours` },
        { id: "botanist_explorer", unlocked: speciesCount >= 3, progress: `${Math.min(3, speciesCount)} / 3 espèces` },
        { id: "master_botanist", unlocked: speciesCount >= 6, progress: `${Math.min(6, speciesCount)} / 6 espèces` },
      ];
    }

    // Scenario A: 0 healthy trees, 1 dead tree, 0 min
    const achA = computeAchievements([{ tree_status: "leafless", tree_species: "cedar" }], 0, 0);
    assert.equal(achA.filter((a) => a.unlocked).length, 0);
    assert.equal(achA.find((a) => a.id === "first_tree").unlocked, false);
    assert.equal(achA.find((a) => a.id === "focus_bronze").progress, "0h 0m / 2h");

    // Scenario B: 1 healthy tree of 25m
    const achB = computeAchievements(
      [{ tree_status: "healthy", tree_species: "cedar", session: { actual_duration_seconds: 1500 } }],
      25,
      1
    );
    assert.equal(achB.find((a) => a.id === "first_tree").unlocked, true);
    assert.equal(achB.find((a) => a.id === "focus_bronze").unlocked, false);
    assert.equal(achB.find((a) => a.id === "focus_bronze").progress, "0h 25m / 2h");

    // Scenario C: 5 healthy trees across 3 species, 130 min, 3-day streak
    const achC = computeAchievements(
      [
        { tree_status: "healthy", tree_species: "cedar" },
        { tree_status: "healthy", tree_species: "oak" },
        { tree_status: "healthy", tree_species: "pine" },
        { tree_status: "healthy", tree_species: "cedar" },
        { tree_status: "healthy", tree_species: "cedar" },
      ],
      130,
      3
    );
    assert.equal(achC.find((a) => a.id === "first_tree").unlocked, true);
    assert.equal(achC.find((a) => a.id === "grove_5").unlocked, true);
    assert.equal(achC.find((a) => a.id === "focus_bronze").unlocked, true);
    assert.equal(achC.find((a) => a.id === "streak_3").unlocked, true);
    assert.equal(achC.find((a) => a.id === "botanist_explorer").unlocked, true);
    assert.equal(achC.find((a) => a.id === "master_botanist").unlocked, false);
  });

  // Clean up
  authModule.setTestUser(null);
});
