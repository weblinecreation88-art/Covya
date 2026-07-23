# Architecture cible — GoToWork Flutter/Firebase

## 1. Décision de dépôt

Créer un dépôt Flutter/Firebase dédié. Le prototype Next.js existant reste une référence Web indépendante et ne partage aucun code d’exécution avec l’application Flutter.

Structure cible du nouveau dépôt :

```text
gotowork-app/
├── apps/
│   └── mobile/                     # Flutter Android, iOS et Web responsive
│       ├── android/
│       ├── ios/
│       ├── web/
│       ├── lib/
│       └── test/
├── packages/
│   ├── gotowork_design_system/
│   └── gotowork_lints/
├── firebase/
│   ├── functions/                  # TypeScript Cloud Functions
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   ├── storage.rules
│   └── tests/
├── docs/
├── scripts/
├── .github/workflows/
├── firebase.json
├── .firebaserc.example
├── .env.example
├── AGENTS.md
└── README.md
```

L’espace entreprise et l’administration utilisent d’abord Flutter Web dans la même application, avec des shells et routes distincts. Une séparation en applications Web dédiées ne sera envisagée qu’en cas de besoins de livraison réellement différents.

## 2. Architecture Flutter

```text
apps/mobile/lib/
├── main.dart
├── app/
│   ├── app.dart
│   ├── bootstrap.dart
│   ├── configuration/
│   │   ├── app_brand_config.dart
│   │   ├── app_environment.dart
│   │   └── firebase_environment.dart
│   ├── localization/
│   ├── router/
│   └── theme/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── extensions/
│   ├── logging/
│   ├── networking/
│   ├── security/
│   └── utils/
├── shared/
│   ├── models/
│   ├── providers/
│   ├── services/
│   └── widgets/
└── features/
    ├── authentication/
    ├── onboarding/
    ├── profile/
    ├── companies/
    ├── company_members/
    ├── vehicles/
    ├── rides/
    ├── matching/
    ├── bookings/
    ├── trip_tracking/
    ├── chat/
    ├── payments/
    ├── wallet/
    ├── subscriptions/
    ├── ratings/
    ├── notifications/
    ├── safety/
    ├── rewards/
    ├── support/
    └── admin/
```

Chaque fonctionnalité utilise uniquement les couches utiles :

```text
feature/
├── data/            # DTO, datasources, implémentations repository
├── domain/          # entités, contrats, règles métier
├── application/     # controllers Riverpod et orchestration
└── presentation/    # routes, écrans et widgets
```

## 3. Principes de dépendance

- La présentation dépend de l’application et du domaine.
- Le domaine ne dépend ni de Flutter ni de Firebase.
- Les implémentations Firebase restent dans `data`.
- Les opérations sensibles passent par Cloud Functions.
- Riverpod fournit les dépendances et expose les états asynchrones.
- Freezed porte les états, unions et modèles immuables.
- `json_serializable` est réservé aux frontières de sérialisation.
- Une abstraction n’est ajoutée que si elle protège une règle métier, une dépendance externe ou la testabilité.

## 4. Configuration de marque

Le nom n’est jamais codé dans les widgets.

```text
AppBrandConfig
├── displayName       # GoToWork ou Covya
├── shortName
├── supportEmail
├── legalName
├── primaryColorSeed
└── assetsPrefix
```

La valeur provient de `--dart-define` ou d’une configuration générée par flavor. Remote Config peut piloter du contenu non critique, mais ne remplace pas les identifiants de build.

## 5. Environnements

| Flavor | Firebase | Bundle suffix | Nom visible |
|---|---|---|---|
| development | projet dev | `.dev` | GoToWork Dev |
| staging | projet staging | `.staging` | GoToWork Staging |
| production | projet prod | aucun | GoToWork |

Chaque flavor possède ses propres options FlutterFire. Aucun secret serveur n’est injecté dans Flutter. Les secrets Functions et paiements restent dans Secret Manager.

## 6. Navigation et contrôle d’accès

GoRouter lit un état de session consolidé :

```text
auth inconnu → splash
non authentifié → onboarding / connexion
authentifié + email non vérifié → vérification email
authentifié + profil incomplet → onboarding salarié/entreprise
profil salarié complet → shell salarié
gestionnaire entreprise autorisé → shell entreprise
claim admin valide → shell administration
```

La navigation améliore l’UX mais ne constitue jamais une barrière de sécurité. Les règles Firestore, Storage et les Functions appliquent les autorisations réelles.

## 7. Modèle backend initial

La première tranche utilise :

- `users/{userId}` : profil public minimal et état d’onboarding ;
- `user_private_data/{userId}` : email, téléphone, zone domicile et consentements ;
- `companies/{companyId}` ;
- `companies/{companyId}/sites/{siteId}` ;
- `companies/{companyId}/members/{userId}` ;
- `companies/{companyId}/invitations/{invitationId}` ;
- `ride_templates/{templateId}` : trajet habituel récurrent.

Le tableau de bord de la première tranche lit uniquement les données réellement créées par l’utilisateur. En l’absence de données, il affiche un état vide explicite.

## 8. Backend Functions initial

- `onUserCreated` : initialise de façon idempotente les documents utilisateur.
- `acceptCompanyInvitation` : vérifie le code, l’expiration et l’email avant de créer le membre.
- `completeEmployeeOnboarding` : valide l’ensemble des champs et finalise le profil.
- `upsertRideTemplate` : valide la routine domicile-travail sans exposer l’adresse exacte.

Les fonctions utilisent les émulateurs, des schémas de validation, des logs structurés et des clés d’idempotence lorsque nécessaire.

## 9. Design system

- Material 3 avec `ColorScheme` clair et sombre.
- Vert comme couleur d’action, bleu nuit/anthracite pour la structure.
- Tokens centralisés : espacements, rayons, ombres, tailles tactiles et durées.
- Composants initiaux : boutons, champs, carte trajet, avatar, badge vérifié, indicateur de progression, états vide/chargement/erreur, dialogue et navigation.
- Localisations FR, EN et AR dès la fondation.
- `Directionality` et tests RTL pour l’arabe.
- Contrastes, tailles adaptatives, sémantique et cibles tactiles vérifiés.

## 10. Stratégie de test

- Domaine : tests unitaires purs.
- Controllers Riverpod : tests avec overrides de providers.
- Écrans : tests de widgets et golden tests ciblés.
- Parcours : tests d’intégration sur émulateurs.
- Firebase : tests explicites des accès autorisés et refusés.
- Functions : tests unitaires et émulateur Firestore/Auth.

La première tranche est acceptée seulement si le parcours complet fonctionne avec Firebase Emulator Suite et avec un projet development.

## 11. CI/CD

Pull requests : format Dart, analyse, tests Flutter, tests Functions, tests Rules et build Web.

Branche principale : mêmes contrôles, build Android de staging et déploiement Firebase staging.

Production : workflow manuel protégé, version taguée, changelog, build signé et déploiement contrôlé.
