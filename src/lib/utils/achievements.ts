import type { ForestEntry, TreeSpecies } from "../../types/database";

export interface ComputedAchievement {
  id: string;
  title: string;
  description: string;
  category: "progression" | "endurance" | "streak" | "botany";
  iconName: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  progressLabel: string;
  isUnlocked: boolean;
  unlockedReward?: string;
}

export function computeStudentAchievements(
  entries: ForestEntry[] = [],
  streak = 0,
  totalFocusedMinutes?: number
): ComputedAchievement[] {
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
    totalFocusedMinutes !== undefined ? totalFocusedMinutes : 0,
    healthyMinutes
  );

  let computedStreak = streak;
  if (!computedStreak) {
    const daysSet = new Set(
      healthyTrees
        .map((e) => {
          const raw = e.earned_at || e.created_at;
          if (!raw) return null;
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-CA");
        })
        .filter(Boolean) as string[]
    );
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString("en-CA");
      if (daysSet.has(dateKey)) {
        computedStreak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
  }

  const plantedSpecies = Array.from(
    new Set(
      healthyTrees
        .map((t) => t.tree_species as TreeSpecies)
        .filter((sp) => ["cedar", "oak", "pine", "willow", "jacaranda", "sakura"].includes(sp))
    )
  );
  const speciesCount = plantedSpecies.length;
  const effectiveFirstTreeCount = Math.max(healthyCount, computedMinutes >= 15 && healthyCount > 0 ? 1 : healthyCount);

  return [
    {
      id: "first_tree",
      title: "Première Pousse",
      description: "Valider une première session Pomodoro complète sans abandon.",
      category: "progression",
      iconName: "Sprout",
      currentValue: effectiveFirstTreeCount,
      targetValue: 1,
      progressPercent: effectiveFirstTreeCount >= 1 ? 100 : 0,
      progressLabel: `${Math.min(1, effectiveFirstTreeCount)} / 1 arbre`,
      isUnlocked: effectiveFirstTreeCount >= 1,
      unlockedReward: "Pied de pousse déverrouillé",
    },
    {
      id: "grove_5",
      title: "Bosquet Naissant",
      description: "Planter 5 arbres sains pour façonner votre premier bosquet.",
      category: "progression",
      iconName: "Trees",
      currentValue: healthyCount,
      targetValue: 5,
      progressPercent: Math.min(100, Math.round((healthyCount / 5) * 100)),
      progressLabel: `${Math.min(5, healthyCount)} / 5 arbres`,
      isUnlocked: healthyCount >= 5,
      unlockedReward: "Extension insulaire",
    },
    {
      id: "grove_15",
      title: "Canopée Florissante",
      description: "Atteindre 15 arbres sains sans interruption de focus.",
      category: "progression",
      iconName: "Sparkles",
      currentValue: healthyCount,
      targetValue: 15,
      progressPercent: Math.min(100, Math.round((healthyCount / 15) * 100)),
      progressLabel: `${Math.min(15, healthyCount)} / 15 arbres`,
      isUnlocked: healthyCount >= 15,
      unlockedReward: "Titre : Silviculteur IGL4",
    },
    {
      id: "full_island_36",
      title: "Île Luxuriante",
      description: "Remplir un quadrant insulaire complet de 36 arbres.",
      category: "progression",
      iconName: "Trophy",
      currentValue: healthyCount,
      targetValue: 36,
      progressPercent: Math.min(100, Math.round((healthyCount / 36) * 100)),
      progressLabel: `${Math.min(36, healthyCount)} / 36 arbres`,
      isUnlocked: healthyCount >= 36,
      unlockedReward: "Déblocage de l'archipel étendu",
    },
    {
      id: "grove_master_100",
      title: "Forêt Séculaire",
      description: "Façonner un vaste écosystème forestier de 100 arbres sains.",
      category: "progression",
      iconName: "Trees",
      currentValue: healthyCount,
      targetValue: 100,
      progressPercent: Math.min(100, Math.round((healthyCount / 100) * 100)),
      progressLabel: `${Math.min(100, healthyCount)} / 100 arbres`,
      isUnlocked: healthyCount >= 100,
      unlockedReward: "Statut Légende Silvicole IGL4",
    },
    {
      id: "focus_bronze",
      title: "Endurance de Bronze",
      description: "Cumuler au moins 2 heures (120 min) de concentration effective.",
      category: "endurance",
      iconName: "Clock",
      currentValue: computedMinutes,
      targetValue: 120,
      progressPercent: Math.min(100, Math.round((computedMinutes / 120) * 100)),
      progressLabel: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 2h`,
      isUnlocked: computedMinutes >= 120,
      unlockedReward: "Médaille de persévérance",
    },
    {
      id: "focus_silver",
      title: "Marathonien du Focus",
      description: "Atteindre 10 heures de révision cumulée sur vos cours.",
      category: "endurance",
      iconName: "Zap",
      currentValue: computedMinutes,
      targetValue: 600,
      progressPercent: Math.min(100, Math.round((computedMinutes / 600) * 100)),
      progressLabel: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 10h`,
      isUnlocked: computedMinutes >= 600,
      unlockedReward: "Badge Marathonien IGL4",
    },
    {
      id: "focus_gold",
      title: "Maître de la Concentration",
      description: "Franchir le cap de 24 heures (1440 min) de travail studieux vérifié.",
      category: "endurance",
      iconName: "Award",
      currentValue: computedMinutes,
      targetValue: 1440,
      progressPercent: Math.min(100, Math.round((computedMinutes / 1440) * 100)),
      progressLabel: `${Math.floor(computedMinutes / 60)}h ${computedMinutes % 60}m / 24h`,
      isUnlocked: computedMinutes >= 1440,
      unlockedReward: "Couronne d'Or Académique",
    },
    {
      id: "streak_3",
      title: "Flamme d'Assiduité",
      description: "Maintenir une série consécutive de 3 jours d'étude réguliers.",
      category: "streak",
      iconName: "Flame",
      currentValue: computedStreak,
      targetValue: 3,
      progressPercent: Math.min(100, Math.round((computedStreak / 3) * 100)),
      progressLabel: `${Math.min(3, computedStreak)} / 3 jours`,
      isUnlocked: computedStreak >= 3,
      unlockedReward: "Aura d'assiduité brillante",
    },
    {
      id: "streak_7",
      title: "Semaine Héroïque",
      description: "Étudier 7 jours consécutifs sans faillir à votre engagement.",
      category: "streak",
      iconName: "Flame",
      currentValue: computedStreak,
      targetValue: 7,
      progressPercent: Math.min(100, Math.round((computedStreak / 7) * 100)),
      progressLabel: `${Math.min(7, computedStreak)} / 7 jours`,
      isUnlocked: computedStreak >= 7,
      unlockedReward: "Insigne Flamme Perpétuelle",
    },
    {
      id: "botanist_explorer",
      title: "Biodiversité Botanique",
      description: "Planter au moins 3 espèces végétales distinctes dans votre bosquet.",
      category: "botany",
      iconName: "Compass",
      currentValue: speciesCount,
      targetValue: 3,
      progressPercent: Math.min(100, Math.round((speciesCount / 3) * 100)),
      progressLabel: `${Math.min(3, speciesCount)} / 3 espèces`,
      isUnlocked: speciesCount >= 3,
      unlockedReward: "Insigne Explorateur Botaniste",
    },
    {
      id: "master_botanist",
      title: "Arboretum Universel",
      description: "Cultiver avec succès les 6 essences végétales du cursus.",
      category: "botany",
      iconName: "Sprout",
      currentValue: speciesCount,
      targetValue: 6,
      progressPercent: Math.min(100, Math.round((speciesCount / 6) * 100)),
      progressLabel: `${Math.min(6, speciesCount)} / 6 espèces`,
      isUnlocked: speciesCount >= 6,
      unlockedReward: "Titre : Maître Botaniste IGL4",
    },
  ];
}
