# Contexte AI input — Cours/TD : Conception et mise en œuvre des Systèmes d’Information (SID/SI)

> Source : PDF scannés fournis par l’utilisateur (notes manuscrites + pages d’exercices).  
> Langue : français. Usage : contexte d’entrée pour un modèle IA (résumés, réponses aux TD, génération d’exercices/corrections, quiz).  
> Attention : certaines lignes manuscrites sont difficiles à lire ; les passages incertains sont marqués `[illisible]` ou reformulés prudemment.

---

## 0) Vue d’ensemble du cours

### Organisation du SI et rôle des acteurs — schéma de la page 1 (Chap. 1)
- Grande boîte : **organisation**.
- En haut : **SIP** = *Système d’Information de Pilotage* (aussi appelé SID dans les notes TD : décision).
- Au centre : **SI** = *Système d’Information*.
- En bas : **SIO** = *Système d’Information Opérant*.
- Au-dessus du SI : **Pilotage / Décision** ; en dessous : **Exécution**.
- À gauche : **Directeurs / Managers (gouvernance)** → alimentent le SIP ; à droite : **Techniciens / Secrétaires / Assistants** → relèvent de l’exécution/SIO.
- Flèches verticales à droite : **Env** ↔ **Ingénieurs/décision** ↔ **P.A.** (probablement “Plan d’Action” ou équipe) ; sens de circulation entre environnement, décision et exécution.

### Définition fonctionnelle notée (Chap. 1, p.1)
- **SI : Collecter → Traiter → Exploiter → Communiquer.**  
  Mention manuscrite : “ensemble des étapes”.

### Urbanisation (Chap. 1, p.1)
- L’**urbanisation** se fait quand une organisation dont les SI sont mal organisés souffre d’un **effet de plat de spaghettis** (forte interdépendance, circulation confuse).
- C’est un **ensemble d’approches pour organiser un SI** afin d’éviter les fortes dépendances entre les projets/composants.
- Dans un SI, il y a **deux types d’acteurs** :
  1. **Acteurs décisionnels** ;
  2. **Acteurs pour l’exécution** (*opérateurs*).

---

## 1) Chapitre 1 — Système d’information “Concepts de base” (TD)

### Exercice 1 — énoncé
Une entreprise de fabrication de meubles utilise différents systèmes d’information pour gérer ses opérations et prendre des décisions stratégiques.

**A. Associer les systèmes suivants à leur catégorie (SIP, SIO) et justifier :**
1. **Système de gestion des chaînes de production** : surveille en temps réel les processus de fabrication et assure que les machines fonctionnent de manière optimale.  
   Annotation manuscrite : `SIO ; justif : nature des acteurs / tâches ; verbes d’action`.
2. **Tableau de bord de gestion des ventes** : permet à la direction de suivre les ventes, comparer les performances par région, et planifier les stratégies de marketing.
3. **Système de suivi des stocks en temps réel** : suit les niveaux de stock des matériaux nécessaires à la production, en alertant le service des achats en cas de rupture.
4. **Rapport financier trimestriel** : compile les données financières globales, permettant à la direction d’évaluer les résultats et de prendre des décisions stratégiques.

**B. Expliquer la différence entre un système d’information de pilotage et un système d’information opérant.**

### Exercice 2 — travail d’équipe
1. Décrire une entreprise fictive (secteur d’activité, taille, objectifs stratégiques).
2. Identifier des exemples de types de SI nécessaires à différents niveaux de management : opérationnel, tactique, stratégique.
3. Proposer une architecture d’urbanisation pour ces SI, en précisant comment ils seront intégrés pour soutenir les objectifs de l’entreprise.
4. Analyser les avantages de cette architecture pour la gestion de l’information et les prises de décision à chaque niveau.

Note manuscrite en bas de l’énoncé :  
`stratégie de Marketing : itérative, incrémentale, flexible` ; `seul, cf compétitions, concentration en interne en Canade [Canada ?]` — passage peu clair.

### Correction manuscrite — TD Chapitre 1 (Exercice 1)
1. **Il s’agit d’un SIO.**  
   Ce système assure la gestion des activités quotidiennes de l’entreprise. Il est centré sur l’optimisation opérationnelle des tâches assurées par les opérateurs. Justification par la **nature des acteurs** et la fréquence des tâches.
2. **Il s’agit d’un SIP (SID).**  
   Le tableau de bord offre à la direction une vue d’ensemble sur les ventes et aide à la prise de décisions stratégiques concernant la stratégie de marketing.
3. **Il s’agit d’un SIO.**  
   Ce système gère le stock en assurant que les produits nécessaires à la production soient disponibles. Il est directement impliqué dans la gestion quotidienne des ressources.
4. **Il s’agit d’un SIP.**  
   Le rapport financier est utilisé par la direction pour analyser la performance financière de l’entreprise afin de prendre des décisions stratégiques.

### Distinction SIP vs SIO à retenir
- **SIO / SI opérant** : exécution quotidienne, tâches opérationnelles, données temps réel, opérateurs, optimisation de processus réguliers.
- **SIP / SI de pilotage (SID)** : consolidation, tableaux de bord, indicateurs, analyse, aide à la décision, stratégie, direction/managers.

---

## 2) Chapitre 2 — Approches d’urbanisation

### 2.1 Notes manuscrites : Zachman Framework
- On va ressaisir toute personne ayant un input.
- Acteurs/perspectives :
  - **Planificateur** : client, qui fait la demande (déclencheur).
  - **Propriétaire** : prend la demande (SIP).
  - **Concepteur** : propose l’idée pour résoudre la requête.
  - **Architecte** : valide l’idée proposée par le concepteur.  
    Les deux sont souvent en poste dans le **SI**.
  - **Ingénieur** : prépare un **P.A.** (plan d’action) / SI.
  - **Opérateur** : exécuteur (SIO).
- Questions du framework :
  - **Quoi ?** Combien de demande.
  - **Comment ?** Le processus (diagramme de séquence, d’activité…).
  - **Où ?** Entités et leurs relations.
  - **Qui ?** Les acteurs qui participent dans l’exécution du processus métier.
  - **Quand ?** Jointure, dépendances…
  - **Pourquoi ?** L’objectif final (pour identifier les entités à l’intérieur du SI), motivation du déclencheur de la requête.
- Usage : méthode pour systèmes rigides, processus stables et ne changeant pas, peu parallèle depuis l’environnement extérieur.

### 2.2 Notes manuscrites : TOGAF
- Se caractérise par la **flexibilité**. Approche agile applicable sur un système instable (flèches bidirectionnelles).
- Phases (version notes) :
  1. **Phase préliminaire** : étude du marché.
  2. **Vision de l’architecture ; analyse et spécification des besoins** : identifier les ressources.
  3. **Architecture de Business** : aspect métier.
  4. **Architecture de S.I.** : conception de SI.
  5. **Architecture technique** : architecture la plus adéquate.
  6. **Opportunités et solutions** : définir les solutions (stratégiques et conceptuelles) — `(SIP et SI)`.
  7. **Planification de la migration** : implémentation (SIO).
  8. **Gouvernance de la mise en œuvre** : confirme le produit réalisé (SI).
  9. **Gestion du changement d’architecture** : confirmation de puis SIP → fin de TOGAF, sinon on répète le cycle.
- Annotation : “Phase d’architecture logicielle et attributs de qualité” (à côté du schéma ADM).

### 2.3 Notes manuscrites : découpage en couches
- On divise l’entreprise en X couches (généralement 3 : SIO, SIP, SI).
- Pour un petit environnement, classique et de processus métier granulaire : petite équipe.

### 2.4 Page de synthèse “Approches d’urbanisation”
1. **Zachman Framework** : cadre conceptuel qui aide à organiser et gérer la complexité des SI en fournissant une vue globale via différentes perspectives. Matrice 6 lignes (planificateur/scope, propriétaire/business/conceptuel, concepteur/système/logique, architecte/technologie/physique, ingénieur/composant/as-built, opérateur/operations/functioning) × 6 colonnes (Quoi/Data, Comment/Fonction, Où/Network, Qui/People, Quand/Time, Pourquoi/Motivation).
2. **TOGAF** : présente un cycle itératif pour développer et gérer l’architecture d’entreprise. Schéma ADM : phase préliminaire ; vision de l’architecture ; architecture de business ; architecture des systèmes d’information ; architecture technique ; opportunités et solutions ; planification de la migration ; gouvernance de la mise en œuvre ; gestion du changement d’architecture ; gestion des exigences au centre.
3. **Découpage en couches** : organisation modulaire, simple à comprendre et à mettre en œuvre. Couches types : Métier (description du métier compréhensible par les acteurs), Fonctionnelle (description et structuration fonctionnelle du SI / services), Applicative (système informatique en composants logiciels / implémentation des services), Technique (infrastructure de fonctionnement du SI et des composants logiciels/applicatifs).

### 2.5 Tableau comparatif (imprimé, Chap. 2 p.6)
| Critères | Zachman | TOGAF | Approche en couches |
|---|---|---|---|
| Structure | Grille 6 perspectives × 6 dimensions | Méthode ADM avec phases séquentielles et itératives (vision, métier, SI, technologie) | SI divisé en couches (présentation, métier, intégration, données, infrastructure) |
| Complexité | Très complexe, vue multidimensionnelle détaillée | Modérément complexe, cadre flexible mais nécessite expertise | Simple et modulaire, facile à comprendre et mettre en œuvre |
| Adaptabilité | Moins adaptable, structure rigide et détaillée | Hautement adaptable avec processus itératifs et personnalisables | Adaptable pour systèmes simples ou modérément complexes |
| Couverture | Vue complète couvrant tous les aspects (métier, systèmes, technologies) | Couverture complète avec approche globale (business, données, applications, technologie) | Couvre surtout les aspects techniques, moins détaillée sur le métier |
| Flexibilité | Peu flexible, stricte et exhaustive | Très flexible, adaptable aux besoins spécifiques | Flexible pour environnements nécessitant séparation modulaire |
| Facilité de mise en œuvre | Difficile, grande expertise et engagement | Moyennement difficile, expertise mais adaptable | Facile, surtout si peu de complexité |
| Itératif ou séquentiel | Séquentiel, non itératif | Itératif avec ajustements continus | Principalement séquentiel, chaque couche peut être mise à jour indépendamment |
| Avantages | Vue exhaustive, structuration rigoureuse | Cadre établi, flexibilité, modularité, communauté active | Facile à comprendre/utiliser, séparation claire, maintenabilité accrue |
| Inconvénients | Très rigide/complexe, excessif pour systèmes simples | Peut être lourd pour PME, nécessite processus structuré | Moins adapté aux environnements très complexes ou vue métier détaillée |
| Utilisation types | Grandes organisations avec besoins détaillés (gouvernements, grandes entreprises industrielles) | Entreprises moyennes à grandes gérant l’évolution du SI | PME ou environnements techniques avec structuration modulaire |

### 2.6 TD Chapitre 2 — énoncé Partie 1
Une entreprise de services souhaite moderniser son SI pour aligner processus métier et objectifs stratégiques. Elle envisage Zachman, TOGAF, urbanisation en couches. Systèmes hérités mal intégrés ⇒ inefficacités. Elle souhaite :
- mieux intégrer ses systèmes pour améliorer la circulation de l’information entre services ;
- réduire la redondance des données et automatiser les tâches administratives ;
- être flexible pour ajouter de nouveaux services avec la croissance.

Questions :
1. Analyser les approches : décrire chaque approche et identifier ses caractéristiques de base.
2. Comparer selon : simplicité de mise en œuvre, adaptabilité, couverture complète.
3. Recommander une approche et justifier (systèmes hérités, besoin d’intégration, flexibilité future).

### 2.7 Correction manuscrite TD Approches d’urbanisation (Partie 1)
- **Zachman** : approche d’urbanisation qui gère et manipule les processus métier rigides appartenant à une organisation classique. Caractéristiques : vue multidimensionnelle ; idéale pour environnements rigides.
- **TOGAF** : approche d’urbanisation agile qui propose une série de phases de développement. Caractéristiques : flexible, favorise l’adaptabilité, itérative.
- **En couches** : approche qui divise le système en plusieurs couches (présentation, métier, infrastructure, données…). Caractéristiques : séparation de responsabilités, simple, utilisé pour gérer les systèmes de petite taille dans des environnements légèrement complexes.
- Recommandation manuscrite : l’entreprise gère des processus complexes et hérités ; dans ce cas **TOGAF** sera la meilleure solution car elle combine flexibilité et ouverture sur les systèmes externes à travers la phase préliminaire.

### 2.8 TD Chapitre 2 — Partie 2 : HealthTech Solutions
**Contexte** : HealthTech Solutions développe et fournit des solutions de gestion de dossiers médicaux électroniques (DME) pour hôpitaux et cliniques. Avec croissance des données médicales et demande d’interopérabilité, l’entreprise cherche à moderniser son SI pour offrir meilleure intégration, améliorer sécurité des données et faciliter l’accès aux informations médicales en temps réel.

**Questions** :
1. Afin d’aider HealthTech Solutions à structurer et aligner son SI pour répondre aux exigences réglementaires, améliorer la gestion des dossiers médicaux et offrir des services innovants aux professionnels de santé, appliquer le **Framework Zachman** (voir tableau).
2. Identifier les avantages de l’application du Zachman Framework au sein de HealthTech Solutions.

**Tableau Zachman vierge à remplir** :
Colonnes : Quoi ? (Data), Comment ? (Fonction), Où ? (Network), Qui ? (People), Quand ? (Time), Pourquoi ? (Motivation).  
Lignes : Vue du planificateur (Scope), Vue du propriétaire (Business/Conceptual), Vue du concepteur (System/Logical), Vue de l’architecte (Technology/Physical), Vue de l’ingénieur (Component/As-built), Vue de l’opérateur (Operations/Functioning).

**Exemple de remplissage attendu (à adapter au cas DME)** :
- **Planificateur/Scope** : identifier les entités clés (patients, dossiers, praticiens, établissements), objectifs réglementaires/interopérabilité, périmètre hôpitaux/cliniques, parties prenantes, cycles de soins, motivations (qualité, conformité, temps réel).
- **Propriétaire/Business** : modèle métier des DME (création, consultation, mise à jour, partage), processus de soins, emplacements/réseaux hospitaliers, rôles (médecin, infirmier, admin, patient), planning des actes/garde, raisons métier (continuité des soins, sécurité).
- **Concepteur/System** : entités logiques (Patient, DossierMedical, Ordonnance, InteropérabilitéHL7/FHIR), services applicatifs (authentification, consentement, audit, accès rapide), topologie logique, workflow métier, calendrier/événements, règles métier.
- **Architecte/Technology** : choix technologiques (bases de données, API, ESB, cloud/hébergement sécurisé, chiffrement), réseaux/zones (LAN hospitalier, DMZ, VPN), matrice de rôles/permissions, ordonnancement batch/temps réel, contraintes de conformité.
- **Ingénieur/As-built** : composants déployés (serveurs, microservices, schémas BD, files de messages), configuration réseau réelle, comptes/acteurs provisionnés, jobs planifiés, mise en œuvre des politiques (RGPD/HIPAA selon contexte).
- **Opérateur/Operations** : données opérationnelles et incidents, supervision des processus, disponibilité réseau, exploitation par le support, fenêtres de maintenance, indicateurs de qualité/conformité.

**Avantages Zachman pour HealthTech (à rédiger)** :
- vue complète et cohérente entre données, fonctions, réseaux, acteurs, temps et motivations ;
- traçabilité des exigences réglementaires et de sécurité de bout en bout ;
- meilleure interopérabilité en structurant les entités et interfaces ;
- séparation claire des responsabilités entre perspectives métier, SI et technologie ;
- facilitation de l’audit, de la gouvernance et de l’évolution contrôlée du SI.

---

## 3) Chapitre 3 — Description et modélisation du processus métier

### 3.1 Notes manuscrites : modélisation des objectifs et évaluation
- On peut modéliser les objectifs stratégiques par un seul outil : le **BMM** (*Business Motivation Model*).
- Éléments notés : **Objectifs**, **Moyens**, **Évaluations**, **Influenceurs**.
- Il est réalisé une seule fois au début pour lancer le projet.
- Puis pour évaluer ces stratégies, on utilise **Ishikawa** (diagramme causes-effets). Schéma : causes `C1, C2, C3, C4` fléchées vers un problème.

### 3.2 Raffinage de la modélisation du processus métier
- Il reste la modélisation de processus qui se fait au niveau pilotage métier :  
  **Décision (SIP) → raffinement (SI) → opéra (SIO)**.
- Chaque processus métier est un ensemble de phases.
- Chaque phase contient des étapes. La première phase contient au moins deux étapes : **déclencheur + action(s) à faire suite à ce déclencheur**. À partir de la phase 2 : **Action + Résultat**.
- Un résultat de la phase `i` déclenche la phase `i+1`.
- **Déclencheur** : activité à faire + par qui + SI. Une bonne description contient : activité + acteur + SI.
- **Action** : activité + relations ; fusion, jointure, décision.
- **Anomalie** : défaut qui demande de retour en arrière ; info manquante.
- Définitions : **Action** ≠ déclencheur ; action = étape dans une phase. **Processus métier** : a un déclencheur + un ensemble de phases.

### 3.3 Exercice 1 — Processus métier “Gestion des livraisons dans une entreprise de services”
Étapes :
1. **Prise de commande**
   - Déclencheur : un client passe une commande en ligne sur la plateforme e-commerce. Annotations : souligner *qui/quoi*, noter SI.
   - Action : le système enregistre les informations du client, détails des articles (quantité, prix, etc.) et méthode de paiement. La commande est soumise à une vérification pour s’assurer de la validité du paiement et de la disponibilité des articles.
2. **Validation du paiement**
   - Action : le système de paiement sécurisé (carte bancaire ou autre) vérifie les fonds et valide la transaction. Note : “doit maintenir la sécurité”.
   - Résultat : si paiement validé, commande confirmée ; sinon, client invité à corriger les informations de paiement. Note : “les décisions”. Annotation : “on n’a pas précisé système de paiement interne/externe”.
3. **Gestion des stocks**
   - Action : le système vérifie la disponibilité des articles commandés dans le stock. Si disponibles, ils sont réservés. Annotation : “la décision doit être dans le bloc action”.
   - Résultat : si un article n’est pas disponible, notification envoyée au client pour substitution ou annulation. Note : “Maj du stock”.
4. **Préparation de la commande**
   - Action : l’équipe logistique reçoit une alerte et prépare les articles. Les articles sont prélevés, emballés et étiquetés. Annotation : “meilleure description (qui fait quoi)”.
   - Résultat : la commande est prête pour expédition.
5. **Expédition et livraison**
   - Action : commande transférée à un transporteur, livraison à l’adresse du client ; client notifié par email/SMS du suivi.
   - Résultat : une fois livrée, commande terminée. Note : “cas non livré”.
6. **Service après-vente**
   - Action : si réclamations (produit endommagé, mauvaise livraison, etc.), le service client gère retours ou remboursements.
   - Résultat : problème résolu selon politique (échange, remboursement, etc.).
Notes finales : “la réclamation est un processus métier” ; “une action doit être élémentaire”.

### 3.4 Exercice 2 — Processus métier “Gestion des réclamations clients dans une entreprise de services”
Étapes :
1. **Réception de la réclamation**
   - Déclencheur : un client contacte le service client via téléphone, email ou formulaire en ligne pour exprimer une réclamation concernant un service non conforme ou insatisfaisant.
   - Action : l’agent du service client enregistre la réclamation dans le système de gestion des incidents, en notant détails du problème (nature, date, informations client).
   - Résultat : notification envoyée au responsable du service concerné pour prise en charge.
2. **Analyse de la réclamation**
   - Action : le responsable analyse la réclamation pour identifier la cause du problème ; peut consulter l’historique des interactions, services rendus ou documents contractuels.
   - Résultat : si réclamation fondée, action corrective initiée ; sinon, client informé que la réclamation est rejetée avec explications.
3. **Prise de décision**
   - Action : l’entreprise décide des mesures (remboursement, compensation, amélioration du service, etc.). Peut nécessiter validation juridique ou direction selon impact financier/juridique.
   - Résultat : une réponse est formulée pour le client avec détails sur les mesures correctives.
4. **Communication avec le client**
   - Action : le service client contacte le client pour expliquer les actions mises en place et proposer une solution. Le client peut donner son accord ou demander des précisions.
   - Résultat : le client accepte ou négocie une solution alternative.
5. **Suivi et clôture de la réclamation**
   - Action : une fois la solution appliquée (remboursement effectué ou intervention technique programmée), la réclamation est marquée comme résolue dans le système.
   - Résultat : processus clôturé ; le service client envoie un message de confirmation au client.
6. **Amélioration continue**
   - Action : les réclamations sont régulièrement analysées pour identifier récurrences et axes d’amélioration. Des rapports sont générés pour la direction afin de détecter tendances et éviter problèmes futurs.
   - Résultat : l’entreprise met en place des actions correctives pour améliorer la qualité et réduire les réclamations.

---

## 4) Concepts clés à extraire pour QCM / fiches
- **SIP/SID** : pilotage, décision, stratégie, direction, tableaux de bord, rapports, analyse.
- **SIO** : opération, exécution, tâches quotidiennes, opérateurs, temps réel, stocks, production.
- **SI** : collecter, traiter, exploiter, communiquer ; support entre pilotage et opération.
- **Urbanisation** : organisation/modularisation des SI pour éviter “plat de spaghettis” ; réduire dépendances ; intégrer systèmes hérités.
- **Zachman** : matrice 6×6 ; exhaustif ; rigide ; adapté aux environnements stables/complexes ; besoin d’expertise.
- **TOGAF/ADM** : cycle itératif ; flexible ; phase préliminaire (marché/environnement), vision, business, SI, technologie, solutions, migration, gouvernance, changement ; recommandé pour hérité + intégration + flexibilité.
- **Couches** : métier/fonctionnel/applicatif/technique ; simple, modulaire ; adapté PME/environnements peu complexes.
- **BMM** : objectifs, moyens, évaluations, influenceurs ; réalisé une fois au début.
- **Ishikawa** : causes-effets pour évaluer stratégies.
- **Processus métier** : déclencheur → phases → étapes ; phase 1 = déclencheur + action ; phases suivantes = action + résultat ; résultat phase i déclenche phase i+1 ; action élémentaire ; anomalie = retour arrière/info manquante.
- Bonnes pratiques de description : préciser **qui fait quoi**, avec quel **SI**, inclure décisions dans le bloc action, préciser interne/externe, gérer cas nominaux et exceptions (non livré, rupture, rejet).

---

## 5) Idées d’exercices à générer à partir de ce contexte
1. Classer 10 systèmes en SIP/SIO/SI avec justification.
2. Remplir la matrice Zachman pour une clinique, une banque, une école, une marketplace.
3. Choisir entre Zachman/TOGAF/couches pour 3 mini-cas et justifier.
4. Décrire un processus métier en phases/étapes avec déclencheur, actions, résultats, SI, anomalies.
5. Transformer l’exercice livraisons en diagramme de séquence ou d’activité.
6. Produire un mini BMM + Ishikawa pour “réduire les réclamations clients”.
