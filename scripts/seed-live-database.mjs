import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Seeding verified base structure into Supabase...");

  // 1. Semesters
  const semesters = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Semester 1",
      academic_year: "2024-2025",
      sort_order: 1,
      is_active: true,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Semester 2",
      academic_year: "2024-2025",
      sort_order: 2,
      is_active: true,
    },
  ];
  await supabase.from("semesters").upsert(semesters, { onConflict: "id" });

  // 2. Resource Categories
  const categories = [
    { id: "a1111111-1111-1111-1111-111111111111", name: "Courses and lecture notes", slug: "courses-notes", description: "Official lecture slides, comprehensive syllabus notes, and instructor handouts.", sort_order: 1, is_active: true },
    { id: "a2222222-2222-2222-2222-222222222222", name: "TP / Practical Work", slug: "tp-practical", description: "Lab sessions, hands-on workshop guidelines, starter code, and practical exercises.", sort_order: 2, is_active: true },
    { id: "a3333333-3333-3333-3333-333333333333", name: "DS / Continuous Assessment", slug: "ds-assessments", description: "Midterm examinations, graded assignments, and in-semester evaluations.", sort_order: 3, is_active: true },
    { id: "a4444444-4444-4444-4444-444444444444", name: "Exams", slug: "exams", description: "Past final exam papers across principal and resit examination sessions.", sort_order: 4, is_active: true },
    { id: "a5555555-5555-5555-5555-555555555555", name: "Cheat Sheets", slug: "cheat-sheets", description: "High-density revision summaries, formula sheets, and quick-reference guides.", sort_order: 5, is_active: true },
    { id: "a6666666-6666-6666-6666-666666666666", name: "Quizzes", slug: "quizzes", description: "Self-assessment question sets, multiple-choice drills, and concept checks.", sort_order: 6, is_active: true },
    { id: "a7777777-7777-7777-7777-777777777777", name: "Exercises and Solutions", slug: "exercises-solutions", description: "Directed work sheets (TD) with step-by-step corrections and explanations.", sort_order: 7, is_active: true },
    { id: "a8888888-8888-8888-8888-888888888888", name: "Summaries", slug: "summaries", description: "Condensed chapter syntheses and high-yield key takeaways for rapid review.", sort_order: 8, is_active: true },
    { id: "a9999999-9999-9999-9999-999999999999", name: "Other Resources", slug: "other", description: "Supplementary references, textbook extracts, and recommended toolchain guides.", sort_order: 9, is_active: true },
  ];
  await supabase.from("resource_categories").upsert(categories, { onConflict: "id" });

  // 3. S1 Subjects (Preserved)
  const s1Id = "11111111-1111-1111-1111-111111111111";
  const subjects = [
    { id: "b1111111-1111-1111-1111-111111111111", semester_id: s1Id, name: "Flutter", slug: "flutter", description: "Cross-platform mobile engineering with Dart, state management, widget trees, and native integration.", icon: "Smartphone", sort_order: 1, is_active: true },
    { id: "b2222222-2222-2222-2222-222222222222", semester_id: s1Id, name: "Blockchain", slug: "blockchain", description: "Distributed ledgers, consensus mechanisms, smart contract development, and cryptographic primitives.", icon: "Link", sort_order: 2, is_active: true },
    { id: "b3333333-3333-3333-3333-333333333333", semester_id: s1Id, name: "Parallel Algorithms", slug: "parallel-algorithms", description: "Multi-core synchronization, OpenMP, MPI paradigms, Amdahl's law, and high-performance computation.", icon: "Cpu", sort_order: 3, is_active: true },
    { id: "b4444444-4444-4444-4444-444444444444", semester_id: s1Id, name: "Artificial Intelligence", slug: "artificial-intelligence", description: "Heuristic search, knowledge representation, probabilistic inference, and machine learning fundamentals.", icon: "Brain", sort_order: 4, is_active: true },
    { id: "b5555555-5555-5555-5555-555555555555", semester_id: s1Id, name: "Cybersecurity", slug: "cybersecurity", description: "Network defense architectures, applied cryptography, vulnerability assessment, and threat modeling.", icon: "ShieldCheck", sort_order: 5, is_active: true },
    { id: "b6666666-6666-6666-6666-666666666666", semester_id: s1Id, name: "Project Management", slug: "project-management", description: "Agile methodologies, Scrum lifecycle, estimation, risk mitigation, and software delivery engineering.", icon: "Kanban", sort_order: 6, is_active: true },
    { id: "b7777777-7777-7777-7777-777777777777", semester_id: s1Id, name: "Enterprise", slug: "enterprise", description: "Corporate organizational models, financial analysis, software product economics, and technology strategy.", icon: "Building2", sort_order: 7, is_active: true },
    { id: "b8888888-8888-8888-8888-888888888888", semester_id: s1Id, name: "Cloud Computing", slug: "cloud-computing", description: "Cloud architectures, serverless runtimes, microservices, container orchestration, and storage scaling.", icon: "Cloud", sort_order: 8, is_active: true },
    { id: "b9999999-9999-9999-9999-999999999999", semester_id: s1Id, name: "Combinatorial Optimization", slug: "combinatorial-optimization", description: "Linear programming, duality theory, graph algorithms, simplex method, and NP-hard heuristics.", icon: "Network", sort_order: 9, is_active: true },
    { id: "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", semester_id: s1Id, name: "Stochastic Processes", slug: "stochastic-processes", description: "Markov chains, Poisson processes, queuing theory, transition matrices, and steady-state probabilities.", icon: "TrendingUp", sort_order: 10, is_active: true },
  ];
  await supabase.from("subjects").upsert(subjects, { onConflict: "id" });

  // 4. Ensure admin user exists
  const { data: usersData } = await supabase.auth.admin.listUsers();
  let systemUserId = usersData?.users?.[0]?.id;

  if (!systemUserId) {
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: "academic-faculty@validily.edu",
      password: "ValidilyAdmin2024!Secure",
      email_confirm: true,
      user_metadata: { full_name: "IGL4 Faculty Department" },
    });
    if (newUser?.user) {
      systemUserId = newUser.user.id;
      await supabase.from("profiles").upsert({
        id: systemUserId,
        display_name: "IGL4 Faculty Department",
        role: "admin",
      });
    }
  }

  console.log("Idempotent base initialization complete! S1 subjects preserved, S2 clean, no demo content.");
}

seed();
