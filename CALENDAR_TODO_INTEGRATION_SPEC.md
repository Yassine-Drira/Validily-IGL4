# Valedli-IGL4 — Emploi du Temps & Gestionnaire de Tâches Académiques
## Guide d'Intégration Expert & Spécification Technique Complète

> **Application Source** : `EduFocus` (`c:/Users/yassi/Desktop/01_Development/test-clones/EduFocus`)  
> **Application Cible** : `Valedli-IGL4` (`c:/Users/yassi/Desktop/02_Academic/Valedli-IGL4`)  
> **Stack Technique Cible** : Next.js 16.4 (App Router), React 19, Tailwind CSS v4, Supabase (PostgreSQL + RLS), Lucide React.  
> **Système de Design Cible** : validily-IGL4 Master Design System (Cobalt `#2855D9`, Navy `#111A2E`, Blanc Froid `#F4F6FA`, Tabular Numbers `font-tabular`).

---

## 1. Philosophie & Synergies avec Valedli-IGL4

Contrairement au style sombre et violet d'EduFocus, ce module s'insère harmonieusement dans l'écosystème académique de **Valedli-IGL4** :
1. **Liaison directe avec les Matières (`Subject`) & Semestres (S1 / S2)** : Chaque tâche et séance de calendrier est rattachée à une matière officielle IGL4 (`Compilation`, `Génie Logiciel`, `Bases de Données`, `Réseaux`, etc.) avec affichage des badges et icônes officiels.
2. **Couplage natif avec le Bosquet Focus (`/forest`)** : Bouton direct *"Lancer Focus"* sur chaque tâche ou créneau horaire, appelant le hook `useFocus()` ([`focus-provider.tsx`](file:///c:/Users/yassi/Desktop/02_Academic/Valedli-IGL4/src/components/focus/focus-provider.tsx)). La fin de séance enregistre automatiquement le temps étudié et plante un arbre dans la forêt de l'étudiant.
3. **Typologie Académique des Tâches** : Catégories adaptées aux élèves-ingénieurs : `TD / TP`, `Projet d'ingénierie`, `Examen / DS`, `Fiche de révision`, `Lecture`.
4. **Timeboxing Glisser-Déposer (Two-Way Drag-and-Drop)** : Glisser une tâche depuis le volet latéral directement sur la grille horaire de la journée pour réserver un créneau de travail.
5. **Quick-Add avec Analyseur en Langage Naturel** : Ex. `"Rapport compilation demain 14h 2h !urgent #compilation"`.

---

## 2. Migration de Base de Données (Supabase PostgreSQL)

Fichier à créer dans la cible : `supabase/migrations/20261018000000_academic_planner_and_tasks.sql`

```sql
-- ============================================================================
-- VALEDLI-IGL4: ACADEMIC PLANNER & TASK MANAGEMENT SCHEMA
-- ============================================================================

-- 1. ENUMS ACADÉMIQUES
DO $$ BEGIN
  CREATE TYPE academic_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE academic_task_category AS ENUM ('td_tp', 'project', 'exam', 'revision', 'reading', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE academic_recurrence_pattern AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE DES TÂCHES ACADÉMIQUES (TODOS)
CREATE TABLE IF NOT EXISTS public.academic_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category academic_task_category NOT NULL DEFAULT 'other',
  priority academic_task_priority NOT NULL DEFAULT 'medium',
  due_date DATE NOT NULL,
  due_time TIME,
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  subtasks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Structure: [{ id, title, done, order }]
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern academic_recurrence_pattern,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_academic_tasks_user_date ON public.academic_tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_academic_tasks_subject ON public.academic_tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_academic_tasks_completed ON public.academic_tasks(user_id, is_completed);

-- 3. TABLE DES BLOCS HORAIRES DE CALENDRIER (TIMEBLOCKS / DAY PLAN)
CREATE TABLE IF NOT EXISTS public.calendar_timeblocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.academic_tasks(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_calendar_timeblocks_user_date ON public.calendar_timeblocks(user_id, block_date);
CREATE INDEX IF NOT EXISTS idx_calendar_timeblocks_task ON public.calendar_timeblocks(task_id);

-- 4. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.academic_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_timeblocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.academic_tasks;
CREATE POLICY "Users can manage their own tasks"
  ON public.academic_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own calendar blocks" ON public.calendar_timeblocks;
CREATE POLICY "Users can manage their own calendar blocks"
  ON public.calendar_timeblocks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 3. Server Actions Cibles (`src/lib/actions/planner-actions.ts`)

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequesterUser } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";

export interface AcademicTask {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  category: "td_tp" | "project" | "exam" | "revision" | "reading" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string; // YYYY-MM-DD
  due_time: string | null; // HH:MM
  estimated_minutes: number;
  actual_minutes: number;
  is_completed: boolean;
  completed_at: string | null;
  subtasks: { id: string; title: string; done: boolean; order: number }[];
  sort_order: number;
  subject?: { id: string; name: string; icon: string | null; semester_id: string };
}

export interface CalendarTimeblock {
  id: string;
  user_id: string;
  task_id: string | null;
  subject_id: string | null;
  title: string;
  block_date: string;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  duration_minutes: number;
  is_completed: boolean;
  notes: string | null;
  subject?: { id: string; name: string; icon: string | null };
}

// ── RÉCUPÉRATION DES TÂCHES ────────────────────────────────────────────────
export async function getAcademicTasksAction(params?: {
  date?: string;
  subjectId?: string;
  completed?: boolean;
}) {
  const user = await getRequesterUser();
  if (!user?.id) return { success: false, error: "Non autorisé" };

  const supabase = await createClient();
  let query = supabase
    .from("academic_tasks")
    .select("*, subject:subjects(id, name, icon, semester_id)")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (params?.date) query = query.eq("due_date", params.date);
  if (params?.subjectId) query = query.eq("subject_id", params.subjectId);
  if (params?.completed !== undefined) query = query.eq("is_completed", params.completed);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as AcademicTask[] };
}

// ── CRÉATION OU MODIFICATION D'UNE TÂCHE ────────────────────────────────────
export async function upsertAcademicTaskAction(task: Partial<AcademicTask>) {
  const user = await getRequesterUser();
  if (!user?.id) return { success: false, error: "Non autorisé" };

  const supabase = await createClient();
  const payload = {
    ...task,
    user_id: user.id,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("academic_tasks")
    .upsert(payload)
    .select("*, subject:subjects(id, name, icon, semester_id)")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/planner");
  return { success: true, data: data as AcademicTask };
}

// ── BASCULE RAPIDE D'ÉTAT D'UNE TÂCHE ───────────────────────────────────────
export async function toggleAcademicTaskAction(taskId: string, isCompleted: boolean) {
  const user = await getRequesterUser();
  if (!user?.id) return { success: false, error: "Non autorisé" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_tasks")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/planner");
  return { success: true, data };
}

// ── SUPPRESSION D'UNE TÂCHE ─────────────────────────────────────────────────
export async function deleteAcademicTaskAction(taskId: string) {
  const user = await getRequesterUser();
  if (!user?.id) return { success: false, error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("academic_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/planner");
  return { success: true };
}

// ── RÉCUPÉRATION DES CRÉNEAUX DU CALENDRIER (PAR PLAGE) ─────────────────────
export async function getCalendarTimeblocksAction(startDate: string, endDate: string) {
  const user = await getRequesterUser();
  if (!user?.id) return { success: false, error: "Non autorisé" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_timeblocks")
    .select("*, subject:subjects(id, name, icon)")
    .eq("user_id", user.id)
    .gte("block_date", startDate)
    .lte("block_date", endDate)
    .order("start_time", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as CalendarTimeblock[] };
}

// ── CRÉATION OU MODIFICATION D'UN CRÉNEAU ───────────────────────────────────
export async function upsertCalendarTimeblockAction(timeblock: Partial<CalendarTimeblock>) {
  const user = await getRequesterUser();
  if (!user?.id) return { success: false, error: "Non autorisé" };

  const supabase = await createClient();
  const payload = {
    ...timeblock,
    user_id: user.id,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("calendar_timeblocks")
    .upsert(payload)
    .select("*, subject:subjects(id, name, icon)")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/planner");
  return { success: true, data: data as CalendarTimeblock };
}
```

---

## 4. Intégration Native avec le Bosquet Focus (`/forest`)

Le composant cible connecte directement le bouton de révision avec le timer de concentration de Valedli :

```tsx
"use client";

import { useFocus } from "@/components/focus/focus-provider";
import { Play, Trees } from "lucide-react";

interface FocusTriggerProps {
  title: string;
  estimatedMinutes: number;
  taskId?: string;
}

export function FocusTriggerButton({ title, estimatedMinutes, taskId }: FocusTriggerProps) {
  const { setIsModalOpen, setWorkDurationMinutes, toggleTimer, isRunning } = useFocus();

  const handleStartFocus = () => {
    // 1. Adapter la durée du Pomodoro à l'estimation de la tâche
    setWorkDurationMinutes(Math.max(5, estimatedMinutes || 25));
    // 2. Ouvrir le hub de focus audio/arbre
    setIsModalOpen(true);
    // 3. Déclencher le chronomètre si non actif
    if (!isRunning) {
      toggleTimer();
    }
  };

  return (
    <button
      onClick={handleStartFocus}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#2855D9] bg-[#EDF2FF] hover:bg-[#DCE7FE] rounded-md transition-colors"
      title="Démarrer une session de travail avec arbre et ambiance sonore"
    >
      <Play className="w-3 h-3 fill-current" />
      <span>Focus</span>
      <Trees className="w-3 h-3 text-[#059669]" />
    </button>
  );
}
```

---

## 5. Architecture des Composants React & Next.js

```
src/
├── app/(workspace)/planner/
│   └── page.tsx                     // Route Server Component "/planner"
├── components/planner/
│   ├── planner-shell.tsx            // Layout réactif en deux colonnes (Desktop & Mobile)
│   ├── academic-calendar-view.tsx   // Grille horaire fluide (Jour, 3-Jours, Semaine)
│   ├── academic-todo-list.tsx       // Gestionnaire de tâches avec filtres Matière et S1/S2
│   ├── task-quick-add.tsx           // Champ de saisie intelligente en langage naturel
│   ├── timeblock-event-card.tsx     // Vignette de cours/révision avec drag handle
│   └── focus-trigger-button.tsx     // Passerelle avec useFocus()
```

### Directives Stylistiques Validily-IGL4 :
* **Palette** :
  * Fond principal : `bg-[#F4F6FA]` (var `--cool-bg`)
  * Cartes : `bg-white border border-[#E4E8F0] shadow-xs rounded-xl`
  * Couleur Maîtresse : `text-[#111A2E]` (var `--ink-navy`), accents `bg-[#2855D9]` (var `--primary-cobalt`)
* **Chiffres et Horaires** : Toujours utiliser la classe `font-tabular` ou `font-mono` pour l'alignement précis des durées et pourcentages.
* **Badges de Matières** : Rendu dynamique avec l'icône de matière `SubjectIcon` issue de `src/components/academic/subject-icon.tsx`.

---

## 6. Mise à Jour de la Navigation (`src/components/layout/app-sidebar.tsx`)

Dans le tableau `navItems` de `app-sidebar.tsx` :
* Changer l'icône de **Semestres** vers `GraduationCap` (libérant l'icône de calendrier).
* Ajouter le nouvel item :
  ```typescript
  { label: "Planning & Tâches", href: "/planner", icon: CalendarCheck2 },
  ```
