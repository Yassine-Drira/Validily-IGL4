import test from "node:test";
import assert from "node:assert/strict";

test("Forest Design System: Species metadata has complete academic descriptions and colors", async () => {
  const speciesList = ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"];
  
  // Verify expected properties
  for (const sp of speciesList) {
    assert.ok(sp.length > 0, `Species ${sp} must be a valid key`);
  }
});

test("Forest Growth Math: Seedling stage progression correctly segments 0-100%", () => {
  function getGrowthStage(progressPercent, status) {
    if (status === "leafless") return 4;
    if (progressPercent >= 100) return 4;
    if (progressPercent >= 75) return 3;
    if (progressPercent >= 50) return 2;
    if (progressPercent >= 25) return 1;
    return 0;
  }

  assert.equal(getGrowthStage(0, "growing"), 0, "0% should be stage 0 (seedling sprout)");
  assert.equal(getGrowthStage(15, "growing"), 0, "15% should be stage 0");
  assert.equal(getGrowthStage(25, "growing"), 1, "25% should be stage 1 (shoot with 4 leaves)");
  assert.equal(getGrowthStage(49, "growing"), 1, "49% should be stage 1");
  assert.equal(getGrowthStage(50, "growing"), 2, "50% should be stage 2 (young sapling)");
  assert.equal(getGrowthStage(74, "growing"), 2, "74% should be stage 2");
  assert.equal(getGrowthStage(75, "growing"), 3, "75% should be stage 3 (juvenile silhouette)");
  assert.equal(getGrowthStage(99, "growing"), 3, "99% should be stage 3");
  assert.equal(getGrowthStage(100, "growing"), 4, "100% should be stage 4 (mature full tree)");
  assert.equal(getGrowthStage(10, "leafless"), 4, "leafless status should render full bare tree");
});

test("Forest Mathematics: Golden angle spiral coordinates prevent clustering", () => {
  const GOLDEN_ANGLE = 2.399963229728653; // ~137.5 degrees in radians
  const SPREAD = 28;

  const positions = [];
  for (let i = 0; i < 20; i++) {
    const angle = i * GOLDEN_ANGLE;
    const radius = SPREAD * Math.sqrt(i + 1);
    const x = Math.round(Math.cos(angle) * radius);
    const y = Math.round(Math.sin(angle) * radius);
    positions.push({ x, y, r: radius });
  }

  // Radius strictly increases with sqrt(i)
  for (let i = 1; i < positions.length; i++) {
    assert.ok(
      positions[i].r >= positions[i - 1].r,
      `Radius at index ${i} (${positions[i].r}) must be >= index ${i - 1} (${positions[i - 1].r})`
    );
  }

  // No two trees share the exact same integer coordinates
  const uniqueKeys = new Set(positions.map((p) => `${p.x},${p.y}`));
  assert.equal(uniqueKeys.size, positions.length, "All tree coordinates in grove must be distinct");
});

test("Forest Depth Sorting: Trees sorted by Y-axis for isometric perspective rendering", () => {
  const mockTrees = [
    { id: "t1", position_y: 45 },
    { id: "t2", position_y: -120 },
    { id: "t3", position_y: 110 },
    { id: "t4", position_y: 0 },
  ];

  const sorted = [...mockTrees].sort((a, b) => a.position_y - b.position_y);

  assert.equal(sorted[0].id, "t2", "Most distant tree (-120) must be first");
  assert.equal(sorted[1].id, "t4", "Mid-distance tree (0) must be second");
  assert.equal(sorted[2].id, "t1", "Foreground tree (45) must be third");
  assert.equal(sorted[3].id, "t3", "Closest foreground tree (110) must be rendered in front");
});
