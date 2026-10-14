import { notFound } from "next/navigation";
import { getQuizzes } from "@/lib/supabase/repository";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { QuizRunner, QuestionData } from "@/components/quizzes/quiz-runner";

export const dynamic = "force-dynamic";

interface QuizPageProps {
  params: Promise<{
    quizId: string;
  }>;
}

const QUIZ_QUESTIONS: Record<string, QuestionData[]> = {
  "quiz-flutter-1": [
    {
      id: "qf-1",
      question_text: "Which StatefulWidget lifecycle method is executed exactly once when the State object is inserted into the element tree?",
      explanation: "`initState()` is invoked once when the State object is created and inserted into the tree. It is ideal for one-time controller initializations and stream subscriptions.",
      options: [
        { id: "o1", text: "build(BuildContext context)", is_correct: false },
        { id: "o2", text: "initState()", is_correct: true },
        { id: "o3", text: "didUpdateWidget()", is_correct: false },
        { id: "o4", text: "didChangeDependencies()", is_correct: false },
      ],
    },
    {
      id: "qf-2",
      question_text: "In Flutter state management with BLoC, what are the primary input and output primitives?",
      explanation: "BLoC (Business Logic Component) accepts Events as inputs via sinks/event handlers, and emits new immutable States as outputs for UI rebuilds.",
      options: [
        { id: "o1", text: "Events in, States out", is_correct: true },
        { id: "o2", text: "Actions in, Reducers out", is_correct: false },
        { id: "o3", text: "Models in, Views out", is_correct: false },
        { id: "o4", text: "Promises in, Callbacks out", is_correct: false },
      ],
    },
    {
      id: "qf-3",
      question_text: "Which widget is the foundational Flutter primitive used to propagate data down the tree without manual prop drilling?",
      explanation: "`InheritedWidget` allows ancestor widgets to share immutable data with child subtree widgets and selectively trigger rebuilds when that data changes.",
      options: [
        { id: "o1", text: "StatefulBuilder", is_correct: false },
        { id: "o2", text: "InheritedWidget", is_correct: true },
        { id: "o3", text: "AnimatedBuilder", is_correct: false },
        { id: "o4", text: "CustomPaint", is_correct: false },
      ],
    },
  ],
  "quiz-sec-1": [
    {
      id: "qs-1",
      question_text: "Which cryptographic algorithm is an asymmetric public-key system whose security relies on the hardness of factoring large composite integers?",
      explanation: "RSA is an asymmetric algorithm where the key generation process depends on the product of two large prime numbers, making prime factorization the underlying hard problem.",
      options: [
        { id: "o1", text: "AES-256", is_correct: false },
        { id: "o2", text: "RSA", is_correct: true },
        { id: "o3", text: "SHA-3", is_correct: false },
        { id: "o4", text: "ChaCha20", is_correct: false },
      ],
    },
    {
      id: "qs-2",
      question_text: "What is the primary security objective of adding a cryptographic salt to passwords prior to hashing?",
      explanation: "A unique random salt ensures that identical plaintext passwords generate different hash digests, completely neutralizing precomputed rainbow table attacks.",
      options: [
        { id: "o1", text: "To eliminate collision resistance", is_correct: false },
        { id: "o2", text: "To defeat precomputed rainbow table dictionary attacks", is_correct: true },
        { id: "o3", text: "To compress the resulting digest length", is_correct: false },
        { id: "o4", text: "To encrypt the password reversibly", is_correct: false },
      ],
    },
  ],
};

export default async function QuizPage({ params }: QuizPageProps) {
  const { quizId } = await params;
  const quizzes = await getQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId);

  if (!quiz) {
    notFound();
  }

  const questions = QUIZ_QUESTIONS[quizId] || [
    {
      id: "sample-1",
      question_text: `Sample drill question for ${quiz.title}: Which principle is fundamental to this module?`,
      explanation: "Official explanation: Understanding core specifications and rigorous architectural separation ensures high exam performance.",
      options: [
        { id: "o1", text: "Modular decomposition and sound architectural abstraction", is_correct: true },
        { id: "o2", text: "Ad-hoc procedural implementation without separation", is_correct: false },
        { id: "o3", text: "Unbounded global variables across components", is_correct: false },
        { id: "o4", text: "Omitting error handling and boundary conditions", is_correct: false },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Practice Quizzes", href: "/quizzes" },
          { label: quiz.title },
        ]}
      />

      <QuizRunner
        quizTitle={quiz.title}
        subjectName={quiz.subject?.name || "Academic Module"}
        difficulty={quiz.difficulty}
        questions={questions}
      />
    </div>
  );
}
