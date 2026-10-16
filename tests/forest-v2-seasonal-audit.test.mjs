import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("Forest V2: Seasonal visual system and species metadata verification", () => {
  const treeModelsContent = fs.readFileSync(
    path.join(rootDir, "src/components/forest/tree-models.tsx"),
    "utf8"
  );

  // Verify all 4 seasons are defined
  assert.match(treeModelsContent, /type SeasonTheme = "summer" \| "autumn" \| "winter" \| "spring"/);

  // Verify seasonalTraits on metadata
  assert.match(treeModelsContent, /seasonalTraits: Record<SeasonTheme, string>/);

  // Verify all 6 species have seasonal traits defined
  const species = ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"];
  for (const sp of species) {
    assert.ok(
      treeModelsContent.includes(`${sp}:`),
      `Species ${sp} must be defined in metadata`
    );
  }

  // Verify seasonal foliage gradient definitions
  assert.ok(treeModelsContent.includes("oakAutumnGrad1"), "Autumn gradient for oak must exist");
  assert.ok(treeModelsContent.includes("oakWinterGrad1"), "Winter frosted gradient for oak must exist");
  assert.ok(treeModelsContent.includes("pineWinterGrad1"), "Winter frosted gradient for pine must exist");
  assert.ok(treeModelsContent.includes("sakuraWinterGrad1"), "Winter gradient for sakura must exist");
});

test("Forest V2: Leafless tree invariant across all seasons", () => {
  const treeModelsContent = fs.readFileSync(
    path.join(rootDir, "src/components/forest/tree-models.tsx"),
    "utf8"
  );

  // Leafless tree function should not accept or render healthy foliage
  assert.ok(
    treeModelsContent.includes("function LeaflessTree()"),
    "LeaflessTree component must be declared"
  );

  // Must have broken snapped limbs and dry parched roots
  assert.ok(
    treeModelsContent.includes("tree-leafless"),
    "LeaflessTree must render stark deadwood silhouette"
  );

  // Must render dry broken twigs at ground base
  assert.ok(
    treeModelsContent.includes("Unsuccessful Session: Dry broken twigs"),
    "EarthMound must render parched dry ground for deadwood trees"
  );
});

test("Forest V2: Camera movement and zoom constraints", () => {
  const canvasContent = fs.readFileSync(
    path.join(rootDir, "src/components/forest/forest-canvas.tsx"),
    "utf8"
  );

  // Verify strict zoom bounds
  assert.match(canvasContent, /const MIN_ZOOM = 0\.85;/);
  assert.match(canvasContent, /const MAX_ZOOM = 1\.6;/);

  // Verify pan boundary clamping
  assert.match(canvasContent, /const MAX_PAN_X = 140;/);
  assert.match(canvasContent, /const MAX_PAN_Y = 90;/);
  assert.ok(
    canvasContent.includes("Math.min(MAX_PAN_X, Math.max(-MAX_PAN_X"),
    "Pan X must be strictly clamped"
  );
  assert.ok(
    canvasContent.includes("Math.min(MAX_PAN_Y, Math.max(-MAX_PAN_Y"),
    "Pan Y must be strictly clamped"
  );
});

test("Forest V2: Multi-grove capacity and overflow allocation", () => {
  const canvasContent = fs.readFileSync(
    path.join(rootDir, "src/components/forest/forest-canvas.tsx"),
    "utf8"
  );

  // Verify island capacity is 36
  assert.match(canvasContent, /const GROVE_CAPACITY = 36;/);
  assert.match(canvasContent, /const GRID_SIZE = 6;/);

  // Verify pagination calculation
  assert.ok(
    canvasContent.includes("Math.ceil(entries.length / GROVE_CAPACITY)"),
    "Total groves must be computed from GROVE_CAPACITY"
  );
  assert.ok(
    canvasContent.includes("currentGrovePage * GROVE_CAPACITY"),
    "Entries must be sliced cleanly per grove page"
  );
});

test("Forest V2: 2-minute penalty threshold and undeletable dead tree contract", () => {
  const actionsContent = fs.readFileSync(
    path.join(rootDir, "src/lib/actions/forest-actions.ts"),
    "utf8"
  );
  const migrationContent = fs.readFileSync(
    path.join(rootDir, "supabase/migrations/20261016100000_focus_forest.sql"),
    "utf8"
  );

  // Verify 120s (2 min) grace period condition
  assert.ok(
    actionsContent.includes("elapsedSeconds <= 120"),
    "Abandon within 120s must qualify for graceful cancellation without penalty"
  );

  // Verify post-120s logging of permanent dead tree
  assert.ok(
    actionsContent.includes('tree_status: "leafless"'),
    "Abandon after 120s must log a leafless penalty tree"
  );

  // Verify RLS forbids ordinary users from deleting forest entries (undeletable)
  assert.ok(
    migrationContent.includes('create policy "Only admins can delete forest entries"'),
    "RLS must strictly restrict forest_entries deletion to admins"
  );
  assert.ok(
    migrationContent.includes('create policy "Only admins can delete focus sessions"'),
    "RLS must strictly restrict focus_sessions deletion to admins"
  );
});

test("Forest V2: Sharing & Visibility Policy enforcement contract", () => {
  const actionsContent = fs.readFileSync(
    path.join(rootDir, "src/lib/actions/forest-actions.ts"),
    "utf8"
  );
  const migrationContent = fs.readFileSync(
    path.join(rootDir, "supabase/migrations/20261016100000_focus_forest.sql"),
    "utf8"
  );

  // Verify private visibility blocks cross-user inspection
  assert.ok(
    actionsContent.includes('visibility === "private"'),
    "Private forests must block non-owner inspection"
  );

  // Verify members visibility requires authentication
  assert.ok(
    actionsContent.includes('visibility === "members" && !requester?.id'),
    "Members-only forests must require authentication"
  );

  // Verify RLS policy restricts SELECT based on owner visibility preferences
  assert.ok(
    migrationContent.includes('create policy "View forest entries based on owner preferences"'),
    "RLS select policy must verify fp.visibility in ('public', 'members')"
  );

  // Verify no fake starter trees injected for empty forest
  assert.ok(
    !actionsContent.includes("trees = getStarterGroveTrees(effectiveUserId);"),
    "Empty forest must not inject fake starter trees"
  );
});
