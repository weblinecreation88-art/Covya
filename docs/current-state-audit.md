# Audit de l’existant — GoToWork / Covya

Date de l’audit : 22 juillet 2026

## 1. Synthèse exécutive

Le dépôt audité est un prototype Web Next.js nommé `covya-web`. Il ne contient actuellement aucun projet Flutter. Le prototype fournit une landing page premium, une authentification Firebase côté client, un profil utilisateur minimal et une première publication/recherche de trajets dans Cloud Firestore.

Le dépôt est sain, compact et peut rester une référence visuelle et fonctionnelle. Il ne doit cependant pas être utilisé comme architecture de départ de l’application Flutter : ses modèles sont trop simples, son backend est incomplet et plusieurs écrans présentent des données marketing simulées.

Décision recommandée : conserver ce dépôt Web séparément et figer son rôle comme prototype de référence. Créer l’application Flutter/Firebase dans un dépôt dédié afin de préserver le déploiement Firebase App Hosting actuel et d’isoler les cycles de livraison mobile, backend et stores.

## 2. Cadre de l’audit

- Dépôt Git : `https://github.com/weblinecreation88-art/Covya.git`
- Branche : `main`
- Dernier commit au moment de l’audit : `089fd8d`
- Prototype déployé : `https://covya--covya-86fa6.europe-west4.hosted.app/`
- Répertoire audité : racine du projet Next.js
- État Git avant audit : propre
- Analyse statique Web : réussie avec `npm run lint`

## 3. Framework et technologies détectés

| Domaine | État actuel |
|---|---|
| Frontend | Next.js 16.2.11, React 19.2.4, TypeScript |
| UI | CSS global personnalisé, Lucide React, responsive Web |
| Authentification | Firebase Authentication Web : email/mot de passe et Google |
| Base de données | Cloud Firestore Web |
| Hébergement | Firebase App Hosting, sortie Next.js `standalone` |
| Flutter | Absent du dépôt |
| Cloud Functions | Absentes |
| Firebase Storage | Non initialisé ; aucune règle Storage |
| FCM / App Check / Analytics / Crashlytics | Absents |
| Tests automatisés | Absents |
| CI/CD | Absente du dépôt |
| Internationalisation | Mention visuelle FR/EN/AR, sans implémentation technique |

## 4. Arborescence utile actuelle

```text
.
├── src/
│   ├── app/
│   │   ├── page.tsx                 # landing page
│   │   ├── connexion/page.tsx
│   │   ├── inscription/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── trajets/page.tsx
│   │   ├── entreprise/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/
│   │   └── dashboard/
│   └── lib/
│       ├── firebase.ts
│       ├── firebase-errors.ts
│       ├── rides.ts
│       └── types.ts
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── next.config.ts
├── package.json
├── .env.example
└── .firebaserc.example
```

## 5. Fichiers de configuration détectés

| Fichier | Diagnostic |
|---|---|
| `package.json` | Scripts Next.js standard, Firebase Web, ESLint |
| `next.config.ts` | Sortie `standalone` compatible App Hosting |
| `firebase.json` | Firestore et Emulator Suite Auth/Firestore uniquement |
| `.env.example` | Variables publiques Firebase Web sans secrets |
| `.firebaserc.example` | Exemple de projet Firebase, pas de projet actif local |
| `firestore.rules` | Règles pour `users` et `rides`, refus par défaut ailleurs |
| `firestore.indexes.json` | Deux index sur la collection `rides` |
| `tsconfig.json` | TypeScript Next.js |
| `eslint.config.mjs` | ESLint Next.js |

Fichiers attendus mais absents : `pubspec.yaml`, `analysis_options.yaml`, `storage.rules`, `functions/`, `flutterfire` options, `.github/workflows/`, configuration de flavors et tests Firebase Rules.

## 6. État de l’environnement local

- Flutter est installé sous `C:\src\flutter`.
- Version détectée dans le cache Flutter : Flutter 3.44.6 stable, Dart 3.12.2.
- Android SDK présent sous le profil utilisateur.
- `adb` n’est pas accessible dans le `PATH`.
- Firebase CLI n’est pas installé globalement.
- Les commandes `flutter --version` et `flutter doctor` n’ont pas répondu dans le délai de 60 secondes. Ce point doit être corrigé avant la création fiable du projet Flutter.
- Aucun `.env.local` ni `.firebaserc` actif n’est présent dans le dépôt Web local.

## 7. Classification fonctionnelle

### Fonctionnel

- Landing page responsive et premium.
- Navigation Web publique.
- Inscription Firebase email/mot de passe.
- Connexion email/mot de passe.
- Connexion Google.
- Session Firebase persistante côté Web.
- Création d’un document utilisateur minimal.
- Lecture temps réel des trajets publiés.
- Publication d’un trajet ponctuel simple.
- Protection basique des routes selon le type de compte.
- Règles Firestore avec refus par défaut pour les collections inconnues.
- Build Next.js autonome pour Firebase App Hosting.

### Partiellement fonctionnel

- Profil : limité au nom, email, rôle de mobilité et nom d’entreprise.
- Entreprise : écran présent, mais aucune collection entreprise accessible et aucune donnée réelle.
- Trajets : un seul concept `rides`; pas de séparation `RideTemplate` / `RideOccurrence`.
- Autorisation : le type de compte est écrit par le client et ne repose pas sur des custom claims.
- Émulateurs : déclarés pour Auth et Firestore, mais Firebase CLI absente et aucun test de règles.
- Configuration Firebase : code prêt, mais aucune configuration locale active.
- Responsive : disponible pour le prototype Web, sans preuve d’accessibilité complète.

### Simulé

- Statistiques marketing de la landing page.
- Nombre d’utilisateurs, taux de satisfaction et témoignage.
- Indicateurs entreprise de démonstration.
- Économies et impact CO₂ affichés dans la maquette du hero.
- Score de matching du hero.

Ces éléments doivent être explicitement marqués comme démonstration hors production ou supprimés avant toute bêta. Aucune donnée simulée ne doit se confondre avec une métrique réelle.

### Absent

- Application Flutter Android/iOS/Web.
- Architecture Riverpod, GoRouter, Freezed et `json_serializable`.
- Flavors development/staging/production.
- Onboarding multi-étapes et reprise de brouillon.
- Profils publics/privés séparés.
- Entreprises, sites, membres et invitations réels.
- Véhicules et documents.
- Matching déterministe modulaire.
- Réservations et machine à états serveur.
- Chat et notifications.
- Géolocalisation, Maps, Places et Routes.
- Storage et règles Storage.
- Paiements, portefeuille et subventions.
- Abonnements, évaluations, sécurité, support et administration.
- Cloud Functions et idempotence.
- App Check, Remote Config, Analytics, Crashlytics et Performance.
- Tests unitaires, widgets, intégration, Functions et Rules.
- Pipeline CI/CD.
- Documentation d’architecture complète.

### Bloquant avant la première tranche Flutter

1. Résoudre le blocage ou la lenteur du CLI Flutter.
2. Rendre `adb` accessible et valider `flutter doctor`.
3. Installer ou utiliser localement Firebase CLI via une dépendance verrouillée.
4. Décider des identifiants Firebase et bundles pour dev/staging/prod.
5. Créer le nouveau dépôt Flutter ou valider explicitement une organisation monorepo.
6. Définir le nom affiché par environnement, centralisé dans la configuration.
7. Obtenir les configurations Firebase non secrètes pour chaque environnement.

### Dette technique

- Modèle Firestore trop plat et insuffisant pour les droits attendus.
- Rôle `company_admin` attribuable depuis le client lors de l’inscription.
- Création du document utilisateur côté client non garantie idempotente.
- Aucune transaction pour les places ou réservations.
- Validation de mise à jour `rides` moins stricte que la création.
- Devise `MAD` codée en dur.
- Nom `Covya` répété dans plusieurs fichiers au lieu d’être configuré.
- Mélange landing, authentification et application dans un petit frontend unique.
- Absence de tests de sécurité et de régression.
- Next.js 16 reste en niveau de support preview chez Firebase App Hosting au moment de l’audit.

## 8. Éléments réutilisables

- Palette vert / bleu nuit et principes visuels premium.
- Logo conceptuel voiture + communauté, à adapter en composant Flutter.
- Hiérarchie des cartes, espacements et rayons.
- Parcours public : landing → choix de compte → inscription/connexion.
- Messages UX et structure des formulaires.
- Première convention de gestion des erreurs Firebase.
- `.env.example` comme inventaire de la configuration Web.
- Intention de refus par défaut des règles Firestore.
- Déploiement Firebase App Hosting du prototype de référence.

## 9. Éléments à remplacer

- Types TypeScript par des modèles Dart métier explicites.
- `rides` par `ride_templates` et `ride_occurrences`.
- Profil utilisateur unique par séparation public/privé/entreprise.
- Autorisation client par custom claims et fonctions serveur.
- Création directe des opérations sensibles par des callable Functions sécurisées.
- CSS global par un design system Material 3 centralisé.
- Navigation Next.js par GoRouter et redirections basées sur l’état métier.
- Statistiques marketing simulées par des états vides ou des agrégats réels.

## 10. Conservation du prototype Web

Le prototype Web doit être conservé séparément.

Motifs :

- il est déjà déployé et connecté à Firebase App Hosting ;
- son historique Git constitue une référence utile ;
- Flutter et Next.js ont des pipelines, dépendances et cycles de livraison différents ;
- un dépôt séparé réduit le risque de casser la démonstration pendant la bêta mobile ;
- le nouveau backend Firebase doit être conçu pour plusieurs clients sans dépendre du prototype.

Recommandation : conserver `weblinecreation88-art/Covya` comme prototype Web et créer un dépôt `weblinecreation88-art/gotowork-app` pour Flutter, Functions, Rules, documentation et CI.

## 11. Conclusion

Le produit dispose d’une bonne référence UX, mais pas encore d’une fondation technique Flutter. La première implémentation ne doit pas commencer par les écrans de trajet avancés. Elle doit établir les environnements, la configuration de marque, le design system, Firebase, la navigation et une tranche verticale authentifiée testable.

Première tranche verticale proposée :

> Un salarié crée son compte, vérifie son email, complète son profil, rejoint une entreprise, ajoute son trajet habituel et arrive sur un tableau de bord alimenté par ses données réelles.
