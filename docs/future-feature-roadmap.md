# 🚀 Validily-IGL4 — Future Feature Roadmap & Competitive Analysis

> **Benchmark Sources :** Quizlet, Anki/SuperMemo, LeetCode, Duolingo, Gizmo, RevisionDojo, Habitica, Forest App  
> **Contraintes :** Toutes les fonctionnalités respectent les quotas Free-Tier (Vercel + Supabase). Calculs déportés côté client, zéro WebSockets continus.

---

## 🗂️ Matrice de Priorisation

| Priorité | Fonctionnalité | Effort Dev | Impact Étudiant | Conso Quota Free-Tier |
| :--- | :--- | :---: | :---: | :---: |
| **P0** | Spaced Repetition SM-2 dans le Carnet d Erreurs | Faible | Maximum | 0% (calcul client + 1 colonne timestamp) |
| **P0** | Heatmap d activité GitHub-style dans /my-space | Faible | Fort | 0% (agrégation locale des sessions existantes) |
| **P1** | Radar Chart de Maîtrise des Compétences | Moyen | Fort | 0% (SVG dynamique calculé en React) |
| **P1** | Défis Asynchrones 1v1 — Ghost Mode | Moyen | Maximum | Très faible (simple table de partage d ID) |
| **P2** | Simulateur d Examen Blanc Chronométré | Moyen | Fort | 0% (assemblage aléatoire de QCM existants) |
| **P2** | Duo Streaks (Binôme de Révision) | Moyen | Fort | Faible (lecture/écriture quotidienne minimale) |
| **P3** | Ligues Hebdomadaires IGL4 (Bronze → Diamant) | Élevé | Maximum | Faible (calcul XP agrégé en cron/hebdo) |
| **P3** | Vault des Annales IGL4 (DS et Examens) | Faible | Fort | Faible (Supabase Storage) |
| **P3** | Astuces Étudiantes Votées (Community Tips) | Moyen | Moyen | Faible |

---

## P0 — Répétition Espacée & Mémorisation Durable

### 1. Algorithme SM-2 / Leitner Automatique sur le Carnet d Erreurs

**Inspiration :** Anki / SuperMemo

- Question ratée -> Révision à J+1
- Si réussie au re-test -> J+3, puis J+7, puis J+14, puis J+30
- Si à nouveau ratée -> Reset à J+1

**Implémentation :**
- Colonne `next_review_at: timestamp` + `srs_interval: int` dans `user_mistakes`
- Widget d accueil : "5 erreurs prêtes à consolider aujourd hui"
- Calcul entièrement côté client, seule la date est persistée en DB

---

### 2. Heatmap d Activité Annuelle (GitHub Contribution Grid)

**Inspiration :** GitHub Activity Graph, WakaTime

- Grille de 365 carrés colorés : minutes focus + quizzes/jour
- Couleur dégradée : gris clair (0 min) → cobalt intense #2855D9 (60+ min)
- Tooltip interactif au survol

**Implémentation :**
- Agrégation locale des `focus_sessions` existantes
- Composant SVG stateless React, zéro requête DB supplémentaire

---

## P1 — Gamification Sociale & Émulation

### 3. Mode Ghost Challenge — Défis Asynchrones 1v1

**Inspiration :** Quizlet Live, BeReal des études

- L étudiant génère un lien de défi après un atelier (ex: 18/20 en 6 min)
- Le rival affronte le "fantôme" du score et chrono original
- Comparatif final + notification au challenger

**Implémentation :**
- Table `quiz_challenges { id, challenger_id, quiz_id, score, time_ms, created_at }`
- Page `/challenge/[id]` accessible sans auth
- 100% asynchrone, zéro socket temps réel

---

### 4. Duo Streaks — Binôme de Révision avec Flamme Partagée

**Inspiration :** Duolingo Friend Streaks, RevisionDojo Buddy System

- Les deux étudiants doivent faire 1 session/jour pour maintenir la flamme commune
- Si l un flanche -> série brisée pour les deux

**Implémentation :**
- Table `study_pairs { id, user_a, user_b, streak_count, last_activity_date }`
- Vérification déclenchée au login (pas de cron serveur)

---

## P1 — Diagnostic & Analyse de Maîtrise

### 5. Radar Chart de Compétences (Skill Spiderweb)

**Inspiration :** LeetCode Skills Assessment, Brilliant.org

- Radar SVG dans le profil : Architecture Microservices, Urbanisation SID, Sécurité, Flutter...
- Calculé depuis les scores de quiz par `QCM_DATA.chapter`
- Optionnellement visible sur le profil public

**Implémentation :**
- Agrégation des `quiz_attempts` filtrées par chapter côté client
- Composant SVG natif ou Recharts (déjà en bundle)

---

## P2 — Simulateur d Examen

### 6. Mock Exam Mode — Examen Blanc Chronométré

**Inspiration :** LeetCode Contests, HackerRank

- 25-30 questions transversales aléatoires sur tous les chapitres du semestre
- Chrono 45 min non pausable, avertissement changement onglet, note/20 avec mention
- Correction post-examen uniquement

**Implémentation :**
- Assemblage aléatoire des QCM_DATA des quiz existants
- Timer client avec useEffect + localStorage (persistance rechargement)

---

## P3 — Compétition & Communauté

### 7. Ligues Hebdomadaires IGL4 (Bronze → Argent → Or → Diamant)

**Inspiration :** Duolingo Leagues, RevisionDojo Weekly Leagues

- Groupes de 20 étudiants par semaine
- XP : Pomodoro 10 pts, Quiz 20 pts, Erreur consolidée 5 pts
- Top 5 montent, bottom 5 descendent chaque dimanche 23h59

---

### 8. Vault des Annales IGL4

- Anciens DS, TP notés, examens finaux filtrés par module/prof/semestre
- Corrigés PDF via Supabase Storage
- Contribution communautaire avec validation admin

---

### 9. Astuces Mnémotechniques Étudiantes (Community Tips)

- Sous chaque question du Carnet d Erreurs : soumission d astuces courtes
- Les plus votées s affichent pour toute la promotion
- Modération légère par les admins

---

## Impact Compétitif Estimé

| Axe | Avant | Après P0+P1 |
| :--- | :--- | :--- |
| Rétention quotidienne | Session ad hoc | Habitude ancrée (SM-2 + Duo Streaks) |
| Viralité | Organique uniquement | Ghost Challenges + Ligues partagées |
| Valeur académique | Quiz + Pomodoro | Diagnostic complet + Mock Exam certifié |
| Différenciation vs Quizlet | Contenu IGL4 spécifique | Architecture IA + Carnet d Erreurs intelligent |

---

*Document créé le 2026-10-20. À mettre à jour après chaque sprint de développement.*
