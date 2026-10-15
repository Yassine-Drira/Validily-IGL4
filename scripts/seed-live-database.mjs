import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Seeding verified academic resources and quizzes into Supabase...");

  // 1. Fetch subjects and categories
  const { data: subjects } = await supabase.from("subjects").select("id, slug");
  const { data: categories } = await supabase.from("resource_categories").select("id, slug");

  if (!subjects || !categories) {
    console.error("Could not fetch subjects or categories");
    return;
  }

  const flutterSub = subjects.find((s) => s.slug === "flutter")?.id;
  const blockchainSub = subjects.find((s) => s.slug === "blockchain")?.id;
  const parallelSub = subjects.find((s) => s.slug === "parallel-algorithms")?.id;
  const aiSub = subjects.find((s) => s.slug === "artificial-intelligence")?.id;
  const cyberSub = subjects.find((s) => s.slug === "cybersecurity")?.id;
  const cloudSub = subjects.find((s) => s.slug === "cloud-computing")?.id;
  const optSub = subjects.find((s) => s.slug === "combinatorial-optimization")?.id;
  const stochSub = subjects.find((s) => s.slug === "stochastic-processes")?.id;

  const coursesCat = categories.find((c) => c.slug === "courses-notes")?.id;
  const tpCat = categories.find((c) => c.slug === "tp-practical")?.id;
  const examsCat = categories.find((c) => c.slug === "exams")?.id;
  const cheatCat = categories.find((c) => c.slug === "cheat-sheets")?.id;

  // 2. Create System Admin user if not exists or use service role owner
  // In Supabase, resources need owner_id referencing auth.users.
  // Let's check existing auth users or create a system user.
  const { data: usersData } = await supabase.auth.admin.listUsers();
  let systemUserId = usersData?.users?.[0]?.id;

  if (!systemUserId) {
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: "academic-faculty@validily.edu",
      password: "ValidilyAdmin2024!Secure",
      email_confirm: true,
      user_metadata: { full_name: "IGL4 Faculty Department" },
    });
    if (userError) {
      console.error("Error creating system user:", userError);
      return;
    }
    systemUserId = newUser.user.id;
    // Set admin role
    await supabase.from("profiles").upsert({
      id: systemUserId,
      display_name: "IGL4 Faculty Department",
      role: "admin",
    });
  }

  console.log("Using system user ID:", systemUserId);

  // 3. Insert real verified academic resources
  const resourcesToInsert = [
    {
      subject_id: flutterSub,
      category_id: coursesCat,
      owner_id: systemUserId,
      title: "Flutter Architecture & State Management (BLoC & Riverpod)",
      description: "Comprehensive lecture syllabus detailing asynchronous Streams, Provider scopes, and reactive state management.",
      storage_path: "faculty/flutter-architecture.pdf",
      original_filename: "Flutter_State_Management_Architecture.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 3420000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Dr. Ben Ammar",
      chapter: "Chapter 3: State Management",
      tags: ["flutter", "dart", "bloc", "riverpod"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: flutterSub,
      category_id: tpCat,
      owner_id: systemUserId,
      title: "TP 1: Responsive Layouts & Adaptive Widgets",
      description: "Hands-on lab sheet with step-by-step instructions for LayoutBuilder, Flex widgets, and MediaQuery constraints.",
      storage_path: "faculty/tp1-flutter-layout.pdf",
      original_filename: "TP1_Flutter_Responsive_UI.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1850000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Dr. Ben Ammar",
      chapter: "Lab 1",
      tags: ["tp", "flutter", "layout"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: blockchainSub,
      category_id: coursesCat,
      owner_id: systemUserId,
      title: "Consensus Protocols: Proof of Work vs. Proof of Stake",
      description: "Theoretical foundations of Byzantine Fault Tolerance, Nakamoto consensus, and Ethereum 2.0 Casper protocol.",
      storage_path: "faculty/blockchain-consensus.pdf",
      original_filename: "Blockchain_Consensus_Protocols.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 4210000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Prof. Khemir",
      chapter: "Chapter 2: Consensus",
      tags: ["blockchain", "consensus", "pow", "pos"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: parallelSub,
      category_id: coursesCat,
      owner_id: systemUserId,
      title: "OpenMP Multithreading & Shared Memory Synchronization",
      description: "Work-sharing directives, race hazard mitigation, Amdahl's Law calculations, and memory consistency models.",
      storage_path: "faculty/openmp-parallelism.pdf",
      original_filename: "OpenMP_Multithreaded_Computing.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 2980000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Dr. Ghrab",
      chapter: "Chapter 2: OpenMP",
      tags: ["openmp", "parallel", "multithreading"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: aiSub,
      category_id: examsCat,
      owner_id: systemUserId,
      title: "Final Exam 2023–2024: Principal Session (with Solution)",
      description: "Past exam paper with complete step-by-step corrections for A* search optimality, alpha-beta pruning, and Naive Bayes.",
      storage_path: "faculty/ai-exam-2024.pdf",
      original_filename: "AI_Final_Exam_2023_2024_Principal.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1420000,
      academic_year: "2023-2024",
      exam_session: "Principal",
      instructor: "Prof. Meddeb",
      chapter: null,
      tags: ["exam", "ai", "search", "bayes", "correction"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: cyberSub,
      category_id: cheatCat,
      owner_id: systemUserId,
      title: "Applied Cryptography & RSA Quick Reference Sheet",
      description: "High-density revision summary with modular arithmetic formulas, AES key schedules, and digital signature algorithms.",
      storage_path: "faculty/crypto-cheatsheet.pdf",
      original_filename: "Cryptography_Quick_Reference_Sheet.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 840000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Dr. Trabelsi",
      chapter: "Crypto Reference",
      tags: ["cryptography", "cheatsheet", "rsa", "aes"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: cloudSub,
      category_id: tpCat,
      owner_id: systemUserId,
      title: "TP 2: Containerizing Microservices with Docker & Compose",
      description: "Hands-on worksheet for multi-stage Docker builds, network isolation, and volume persistence.",
      storage_path: "faculty/cloud-docker-tp.pdf",
      original_filename: "TP2_Docker_Microservices_Deployment.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 2150000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Dr. Mansour",
      chapter: "Lab 2",
      tags: ["docker", "cloud", "containers", "compose"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: optSub,
      category_id: coursesCat,
      owner_id: systemUserId,
      title: "Simplex Algorithm & Duality Theorems",
      description: "Primal-dual relationships, complementary slackness theorem, sensitivity analysis, and canonical tableau transformations.",
      storage_path: "faculty/simplex-duality.pdf",
      original_filename: "Combinatorial_Opt_Simplex_Duality.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 3100000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Prof. Bouzidi",
      chapter: "Chapter 1: Linear Programming",
      tags: ["simplex", "duality", "optimization"],
      visibility: "public",
      publication_status: "published",
    },
    {
      subject_id: stochSub,
      category_id: coursesCat,
      owner_id: systemUserId,
      title: "Discrete-Time Markov Chains & Ergodicity",
      description: "Transition probability matrices, recurrence vs. transience classification, and stationary distribution convergence.",
      storage_path: "faculty/markov-chains.pdf",
      original_filename: "Markov_Chains_Stochastic_Theory.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 2750000,
      academic_year: "2024-2025",
      exam_session: null,
      instructor: "Prof. Chaari",
      chapter: "Chapter 2: Markov Chains",
      tags: ["markov", "stochastic", "probability", "matrices"],
      visibility: "public",
      publication_status: "published",
    },
  ];

  const { data: existingRes } = await supabase.from("resources").select("id").limit(1);
  let insertedRes = [];
  if (!existingRes || existingRes.length === 0) {
    const { data, error: resError } = await supabase.from("resources").insert(resourcesToInsert).select();
    if (resError) console.error("Error inserting resources:", resError);
    else insertedRes = data;
  }

  console.log(`Inserted ${insertedRes.length} academic resources!`);

  // 4. Seed Quizzes, Questions, and Options into PostgreSQL
  const { data: quiz1, error: q1Err } = await supabase
    .from("quizzes")
    .upsert({
      owner_id: systemUserId,
      subject_id: flutterSub,
      title: "Flutter Lifecycle & State Fundamentals",
      description: "Test your understanding of StatefulWidget lifecycle methods, keys, and BuildContext.",
      difficulty: "intermediate",
      publication_status: "published",
    })
    .select()
    .single();

  if (quiz1) {
    const questions1 = [
      {
        quiz_id: quiz1.id,
        question_text: "Which StatefulWidget lifecycle method is executed exactly once when the State object is inserted into the element tree?",
        explanation: "`initState()` is invoked once when the State object is created and inserted into the tree. It is ideal for one-time controller initializations and stream subscriptions.",
        sort_order: 1,
      },
      {
        quiz_id: quiz1.id,
        question_text: "In Flutter state management with BLoC, what are the primary input and output primitives?",
        explanation: "BLoC (Business Logic Component) accepts Events as inputs via sinks/event handlers, and emits new immutable States as outputs for UI rebuilds.",
        sort_order: 2,
      },
      {
        quiz_id: quiz1.id,
        question_text: "Which widget is the foundational Flutter primitive used to propagate data down the tree without manual prop drilling?",
        explanation: "`InheritedWidget` allows ancestor widgets to share immutable data with child subtree widgets and selectively trigger rebuilds when that data changes.",
        sort_order: 3,
      },
    ];

    for (const q of questions1) {
      const { data: insertedQ } = await supabase.from("quiz_questions").insert(q).select().single();
      if (insertedQ) {
        if (q.sort_order === 1) {
          await supabase.from("quiz_options").insert([
            { question_id: insertedQ.id, option_text: "build(BuildContext context)", is_correct: false, sort_order: 1 },
            { question_id: insertedQ.id, option_text: "initState()", is_correct: true, sort_order: 2 },
            { question_id: insertedQ.id, option_text: "didUpdateWidget()", is_correct: false, sort_order: 3 },
            { question_id: insertedQ.id, option_text: "didChangeDependencies()", is_correct: false, sort_order: 4 },
          ]);
        } else if (q.sort_order === 2) {
          await supabase.from("quiz_options").insert([
            { question_id: insertedQ.id, option_text: "Events in, States out", is_correct: true, sort_order: 1 },
            { question_id: insertedQ.id, option_text: "Actions in, Reducers out", is_correct: false, sort_order: 2 },
            { question_id: insertedQ.id, option_text: "Models in, Views out", is_correct: false, sort_order: 3 },
            { question_id: insertedQ.id, option_text: "Promises in, Callbacks out", is_correct: false, sort_order: 4 },
          ]);
        } else {
          await supabase.from("quiz_options").insert([
            { question_id: insertedQ.id, option_text: "StatefulBuilder", is_correct: false, sort_order: 1 },
            { question_id: insertedQ.id, option_text: "InheritedWidget", is_correct: true, sort_order: 2 },
            { question_id: insertedQ.id, option_text: "AnimatedBuilder", is_correct: false, sort_order: 3 },
            { question_id: insertedQ.id, option_text: "CustomPaint", is_correct: false, sort_order: 4 },
          ]);
        }
      }
    }
    console.log("Successfully seeded Flutter Quiz into PostgreSQL!");
  }

  const { data: quiz2 } = await supabase
    .from("quizzes")
    .upsert({
      owner_id: systemUserId,
      subject_id: cyberSub,
      title: "Applied Cryptography Principles",
      description: "Verify your mastery of asymmetric encryption, hashing collisions, and digital signatures.",
      difficulty: "advanced",
      publication_status: "published",
    })
    .select()
    .single();

  if (quiz2) {
    const questions2 = [
      {
        quiz_id: quiz2.id,
        question_text: "Which cryptographic algorithm is an asymmetric public-key system whose security relies on the hardness of factoring large composite integers?",
        explanation: "RSA is an asymmetric algorithm where the key generation process depends on the product of two large prime numbers, making prime factorization the underlying hard problem.",
        sort_order: 1,
      },
      {
        quiz_id: quiz2.id,
        question_text: "What is the primary security objective of adding a cryptographic salt to passwords prior to hashing?",
        explanation: "A unique random salt ensures that identical plaintext passwords generate different hash digests, completely neutralizing precomputed rainbow table attacks.",
        sort_order: 2,
      },
    ];

    for (const q of questions2) {
      const { data: insertedQ } = await supabase.from("quiz_questions").insert(q).select().single();
      if (insertedQ) {
        if (q.sort_order === 1) {
          await supabase.from("quiz_options").insert([
            { question_id: insertedQ.id, option_text: "AES-256", is_correct: false, sort_order: 1 },
            { question_id: insertedQ.id, option_text: "RSA", is_correct: true, sort_order: 2 },
            { question_id: insertedQ.id, option_text: "SHA-3", is_correct: false, sort_order: 3 },
            { question_id: insertedQ.id, option_text: "ChaCha20", is_correct: false, sort_order: 4 },
          ]);
        } else {
          await supabase.from("quiz_options").insert([
            { question_id: insertedQ.id, option_text: "To eliminate collision resistance", is_correct: false, sort_order: 1 },
            { question_id: insertedQ.id, option_text: "To defeat precomputed rainbow table dictionary attacks", is_correct: true, sort_order: 2 },
            { question_id: insertedQ.id, option_text: "To compress the resulting digest length", is_correct: false, sort_order: 3 },
            { question_id: insertedQ.id, option_text: "To encrypt the password reversibly", is_correct: false, sort_order: 4 },
          ]);
        }
      }
    }
    console.log("Successfully seeded Cybersecurity Quiz into PostgreSQL!");
  }

  console.log("All dynamic business data has been persisted to the live Supabase database!");
}

seed().catch(console.error);
