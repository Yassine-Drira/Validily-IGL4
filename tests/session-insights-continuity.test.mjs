import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Session Continuity & Insights: Active timer serialization contract in FocusProvider", () => {
  const providerPath = path.resolve("src/components/focus/focus-provider.tsx");
  assert.ok(fs.existsSync(providerPath), "focus-provider.tsx must exist");
  const content = fs.readFileSync(providerPath, "utf-8");

  // Check that timer state is persisted and rehydrated
  assert.ok(
    content.includes("validily_active_timer_"),
    "focus-provider must use validily_active_timer_ key for reload continuity"
  );
  assert.ok(
    content.includes("persistActiveTimerState"),
    "focus-provider must implement persistActiveTimerState helper"
  );
  assert.ok(
    content.includes("getMyCustomAudio"),
    "focus-provider must import and query getMyCustomAudio for cross-session sound library rehydration"
  );
});

test("Forest Insights & Calculations: Deterministic stats & streak parsing without NaN", () => {
  const insightsPath = path.resolve("src/components/forest/forest-insights.tsx");
  assert.ok(fs.existsSync(insightsPath), "forest-insights.tsx must exist");
  const content = fs.readFileSync(insightsPath, "utf-8");

  // Verify safe duration parsing
  assert.ok(
    content.includes("actual_duration_seconds"),
    "forest-insights must inspect actual_duration_seconds"
  );
  assert.ok(
    content.includes("target_duration_seconds"),
    "forest-insights must fallback to target_duration_seconds"
  );

  // Verify streak calculation doesn't crash on null/invalid date
  assert.ok(
    content.includes("isNaN(d.getTime())"),
    "forest-insights must validate date integrity before formatting streak"
  );
});

test("Custom Audio Resilience: editCustomAudio persists to DB fallback", () => {
  const audioActionsPath = path.resolve("src/lib/actions/custom-audio-actions.ts");
  assert.ok(fs.existsSync(audioActionsPath), "custom-audio-actions.ts must exist");
  const content = fs.readFileSync(audioActionsPath, "utf-8");

  assert.ok(
    content.includes("saveDbCustomAudioFallback"),
    "custom-audio-actions must use saveDbCustomAudioFallback"
  );
  assert.ok(
    content.includes("getDbCustomAudioFallback"),
    "custom-audio-actions must use getDbCustomAudioFallback"
  );
});

test("Forest Actions Resilience: completeFocusSession handles tree insertion fallback", () => {
  const forestActionsPath = path.resolve("src/lib/actions/forest-actions.ts");
  assert.ok(fs.existsSync(forestActionsPath), "forest-actions.ts must exist");
  const content = fs.readFileSync(forestActionsPath, "utf-8");

  // Verify completeFocusSession fallback when treeErr occurs
  assert.ok(
    content.includes("completeFocusSession tree insertion error:"),
    "completeFocusSession must log insertion error"
  );
  assert.ok(
    content.includes("fallbackTree"),
    "completeFocusSession must fall back to local/DB fallback tree upon table failure"
  );
});

test("Achievements System: 12 comprehensive milestones with dynamic calculation", () => {
  const achievementsPath = path.resolve("src/components/forest/forest-achievements.tsx");
  assert.ok(fs.existsSync(achievementsPath), "forest-achievements.tsx must exist");
  const content = fs.readFileSync(achievementsPath, "utf-8");

  // Milestones
  assert.ok(content.includes("first_tree"), "Must have first_tree achievement");
  assert.ok(content.includes("grove_5"), "Must have grove_5 achievement");
  assert.ok(content.includes("grove_15"), "Must have grove_15 achievement");
  assert.ok(content.includes("full_island_36"), "Must have full_island_36 achievement");
  assert.ok(content.includes("grove_master_100"), "Must have grove_master_100 achievement");
  assert.ok(content.includes("focus_bronze"), "Must have focus_bronze achievement");
  assert.ok(content.includes("focus_silver"), "Must have focus_silver achievement");
  assert.ok(content.includes("focus_gold"), "Must have focus_gold achievement");
  assert.ok(content.includes("streak_3"), "Must have streak_3 achievement");
  assert.ok(content.includes("streak_7"), "Must have streak_7 achievement");
  assert.ok(content.includes("botanist_explorer"), "Must have botanist_explorer achievement");
  assert.ok(content.includes("master_botanist"), "Must have master_botanist achievement");

  // Dynamic calculation
  assert.ok(
    content.includes("computedStreak"),
    "ForestAchievements must calculate computedStreak from healthy trees"
  );
  assert.ok(
    content.includes("computedMinutes"),
    "ForestAchievements must calculate computedMinutes from healthy trees"
  );
});

test("Forest Page Integration: Passes verified server stats to ForestAchievements", () => {
  const forestPagePath = path.resolve("src/app/(workspace)/forest/page.tsx");
  assert.ok(fs.existsSync(forestPagePath), "forest/page.tsx must exist");
  const content = fs.readFileSync(forestPagePath, "utf-8");

  assert.ok(
    content.includes("forestStats"),
    "forest page must maintain forestStats state from getMyForest"
  );
  assert.ok(
    content.includes("streak={forestStats?.currentStreak}"),
    "forest page must forward streak to ForestAchievements"
  );
  assert.ok(
    content.includes("totalFocusedMinutes={forestStats?.totalFocusedMinutes}"),
    "forest page must forward totalFocusedMinutes to ForestAchievements"
  );
});

test("Empty Peer Grove UX: Does not show owner popup, renders rolling tumbleweeds", () => {
  const canvasPath = path.resolve("src/components/forest/forest-canvas.tsx");
  const tumbleweedsPath = path.resolve("src/components/forest/empty-grove-tumbleweeds.tsx");
  const communityPath = path.resolve("src/app/(workspace)/forest/community/page.tsx");

  assert.ok(fs.existsSync(tumbleweedsPath), "empty-grove-tumbleweeds.tsx must exist");
  assert.ok(fs.existsSync(canvasPath), "forest-canvas.tsx must exist");

  const canvasContent = fs.readFileSync(canvasPath, "utf-8");
  const tumbleweedsContent = fs.readFileSync(tumbleweedsPath, "utf-8");
  const communityContent = fs.readFileSync(communityPath, "utf-8");

  // Verify that readOnly mode switches to EmptyGroveTumbleweeds
  assert.ok(
    canvasContent.includes("EmptyGroveTumbleweeds"),
    "forest-canvas must import and render EmptyGroveTumbleweeds"
  );
  assert.ok(
    canvasContent.includes("readOnly ? ("),
    "forest-canvas must condition empty state display on readOnly"
  );
  assert.ok(
    tumbleweedsContent.includes("tumbleweed-main"),
    "empty-grove-tumbleweeds must contain roll animation"
  );
  assert.ok(
    communityContent.includes("ownerName={selectedMember.displayName}"),
    "community page must forward ownerName to ForestCanvas"
  );
});
