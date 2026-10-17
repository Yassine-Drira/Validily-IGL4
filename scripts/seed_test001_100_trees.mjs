import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const env = {};
if (fs.existsSync(".env.local")) {
  fs.readFileSync(".env.local", "utf-8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://avbsinvpwosvnfjyajkk.supabase.co";
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const USER_ID = "2537d0cd-2632-409a-bc6a-bf1a44984081"; // test001 (xebifas720@ensproxy.com)

const SPECIES_LIST = ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"];
const LABELS = [
  "Révision Algorithmes Parallèles & MPI",
  "Lecture Deep Learning & Transformers",
  "TP Conception Systèmes Temps Réel",
  "Synthèse Architecture Microservices",
  "Préparation Examen Cryptographie Asymétrique",
  "Lecture Spécifications Blockchain & Consensus",
  "Exercices Programmation Concurrente",
  "Fiche Révision Sécurité Réseaux",
  "Pratique Docker & Orchestration K8s",
  "Analyse Complexité & Structures Arborescentes",
];

const DURATIONS = [900, 1500, 1800, 2700, 3600, 5400]; // 15m, 25m, 30m, 45m, 60m, 90m

async function seed100Trees() {
  console.log("=== SEEDING 100 VISUAL TREES FOR USER TEST001 ===");
  console.log(`Target User ID: ${USER_ID}`);

  // 1. Fetch available subjects for realistic subject_id linking
  const { data: subjects } = await supabase.from("subjects").select("id, name");
  const subjectList = subjects && subjects.length > 0 ? subjects : [{ id: null, name: "Général" }];
  console.log(`Found ${subjectList.length} subjects for session category mapping.`);

  // 2. Clear old test001 forest entries & focus sessions to ensure exactly 100 pristine trees
  console.log("Cleaning previous entries for test001...");
  await supabase.from("forest_entries").delete().eq("user_id", USER_ID);
  await supabase.from("focus_sessions").delete().eq("user_id", USER_ID);

  const now = Date.now();
  const sessionsToInsert = [];
  const entriesToInsert = [];

  for (let i = 0; i < 100; i++) {
    const sessionId = crypto.randomUUID();
    const entryId = crypto.randomUUID();

    // Distribute species evenly
    const species = SPECIES_LIST[i % SPECIES_LIST.length];

    // 94 healthy trees, 6 leafless trees for visual contrast
    const isHealthy = i % 16 !== 0;
    const treeStatus = isHealthy ? "healthy" : "leafless";

    // Growth stage: 1 to 4
    const growthStage = (i % 4) + 1;

    // Pick subject and duration
    const subject = subjectList[i % subjectList.length];
    const duration = DURATIONS[i % DURATIONS.length];
    const actualSeconds = isHealthy ? duration : Math.round(duration * 0.35);

    // Spread earned_at across the past 28 days
    const daysAgo = Math.floor((100 - i) * 0.28);
    const hoursOffset = (i * 3) % 24;
    const minutesOffset = (i * 17) % 60;
    const earnedDate = new Date(now - daysAgo * 86400000 - hoursOffset * 3600000 - minutesOffset * 60000);
    const earnedIso = earnedDate.toISOString();

    const sessionLabel = LABELS[i % LABELS.length];

    // Scale factor 0.85 to 1.15 for natural visual variety
    const scale = Number((0.88 + ((i * 13) % 27) * 0.01).toFixed(2));
    const posX = ((i * 11) % 90) + 5;
    const posY = ((i * 17) % 85) + 8;

    sessionsToInsert.push({
      id: sessionId,
      user_id: USER_ID,
      subject_id: subject.id,
      session_label: sessionLabel,
      target_duration_seconds: duration,
      actual_duration_seconds: actualSeconds,
      status: isHealthy ? "completed" : "interrupted",
      tree_species: species,
      started_at: new Date(earnedDate.getTime() - duration * 1000).toISOString(),
      completed_at: isHealthy ? earnedIso : null,
      interrupted_at: isHealthy ? null : earnedIso,
      interruption_reason: isHealthy ? null : "Interruption de session d'étude",
      created_at: earnedIso,
      updated_at: earnedIso,
    });

    entriesToInsert.push({
      id: entryId,
      session_id: sessionId,
      user_id: USER_ID,
      tree_status: treeStatus,
      tree_species: species,
      growth_stage: growthStage,
      position_x: posX,
      position_y: posY,
      scale_factor: scale,
      earned_at: earnedIso,
      created_at: earnedIso,
    });
  }

  // 3. Batch insert sessions (in chunks of 50)
  console.log(`Inserting ${sessionsToInsert.length} focus sessions...`);
  for (let i = 0; i < sessionsToInsert.length; i += 50) {
    const chunk = sessionsToInsert.slice(i, i + 50);
    const { error: sessErr } = await supabase.from("focus_sessions").insert(chunk);
    if (sessErr) {
      console.error("Error inserting sessions chunk:", sessErr);
      throw sessErr;
    }
  }

  // 4. Batch insert forest entries (in chunks of 50)
  console.log(`Inserting ${entriesToInsert.length} forest entries (trees)...`);
  for (let i = 0; i < entriesToInsert.length; i += 50) {
    const chunk = entriesToInsert.slice(i, i + 50);
    const { error: treeErr } = await supabase.from("forest_entries").insert(chunk);
    if (treeErr) {
      console.error("Error inserting trees chunk:", treeErr);
      throw treeErr;
    }
  }

  // 5. Update forest preferences for test001 to ensure grove is visible
  await supabase.from("forest_preferences").upsert({
    user_id: USER_ID,
    visibility: "members",
    default_tree_species: "cedar",
    allow_classmate_cheers: true,
    updated_at: new Date().toISOString(),
  });

  // 6. Write disk cache backup for local development continuity
  const CACHE_DIR = path.join(process.cwd(), ".validily-cache");
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const diskTrees = entriesToInsert.map((e, idx) => ({
    ...e,
    session: {
      ...sessionsToInsert[idx],
      subject: subjectList.find((s) => s.id === sessionsToInsert[idx].subject_id) || null,
    },
  }));

  fs.writeFileSync(
    path.join(CACHE_DIR, `forest_${USER_ID}.json`),
    JSON.stringify(diskTrees, null, 2)
  );
  console.log(`Wrote backup disk cache with ${diskTrees.length} trees to .validily-cache.`);

  // 7. Verification count
  const { count: finalCount, error: countErr } = await supabase
    .from("forest_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", USER_ID);

  console.log("\n=======================================================");
  console.log(`[SUCCESS] test001 Bosquet seeded! Total trees in DB: ${finalCount}`);
  console.log("Distribution by Species:");
  for (const sp of SPECIES_LIST) {
    const spCount = entriesToInsert.filter((e) => e.tree_species === sp).length;
    console.log(`  - ${sp.padEnd(10)}: ${spCount} trees`);
  }
  const healthyCount = entriesToInsert.filter((e) => e.tree_status === "healthy").length;
  const leaflessCount = entriesToInsert.filter((e) => e.tree_status === "leafless").length;
  console.log(`Health: ${healthyCount} healthy, ${leaflessCount} leafless`);
  console.log("=======================================================");
}

seed100Trees().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
