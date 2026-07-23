# Backlog ordonné — GoToWork

## Règles de livraison

- Une fonctionnalité n’est terminée que si elle utilise des données réelles ou un état de démonstration explicitement isolé.
- Chaque tranche inclut analyse statique, tests concernés, documentation et critères d’acceptation.
- Les opérations sensibles et financières ne sont jamais validées par le client seul.
- La sécurité et l’accessibilité font partie de chaque tâche, pas d’une phase finale.

## P0 — Déblocage de l’environnement

1. Diagnostiquer le blocage du CLI Flutter.
2. Configurer Android SDK et `adb` dans le `PATH`.
3. Verrouiller Firebase CLI dans les dépendances de développement backend.
4. Créer le dépôt Flutter/Firebase dédié.
5. Créer les projets Firebase development, staging et production.
6. Définir les bundle IDs, application IDs et noms par flavor.

Critère de sortie : `flutter doctor` est acceptable, une application vide démarre sur Android et Web, et les émulateurs Firebase démarrent localement.

## P1 — Fondation technique

1. Initialiser Flutter stable et les trois flavors.
2. Ajouter Riverpod, GoRouter, Freezed, `json_serializable`, `intl` et localisations.
3. Créer `AppBrandConfig` pour GoToWork/Covya.
4. Créer le bootstrap, la gestion d’erreurs et le logging structuré.
5. Créer le design system Material 3 clair/sombre.
6. Ajouter FR, EN et AR avec RTL.
7. Initialiser Firebase Auth, Firestore, Storage, Functions et Emulator Suite.
8. Ajouter App Check selon l’environnement.
9. Créer la CI : format, analyse, tests, build Web.
10. Ajouter README, AGENTS et documentation de démarrage.

Critère de sortie : l’application affiche un écran de diagnostic brandé, localisé et connecté à l’environnement sélectionné sans secret commité.

## P2 — Première tranche verticale : salarié → tableau de bord

### Authentification

1. Splash et résolution de session.
2. Inscription email/mot de passe.
3. Connexion.
4. Vérification email.
5. Mot de passe oublié.
6. Déconnexion.
7. `onUserCreated` idempotent côté Functions.

### Onboarding salarié

8. Identité et téléphone.
9. Entreprise et invitation.
10. Site de travail.
11. Zone de départ approximative.
12. Horaires et jours travaillés.
13. Rôle passager/conducteur/les deux.
14. Préférences et permissions.
15. Sauvegarde et reprise du brouillon.
16. Résumé et finalisation serveur.

### Trajet habituel

17. Création d’un `RideTemplate` aller/retour.
18. Validation des horaires et jours.
19. Protection de l’adresse exacte.

### Tableau de bord

20. Afficher le profil réel, l’entreprise réelle et le trajet habituel réel.
21. Afficher des états vides si aucun trajet ou match n’existe.
22. Ajouter les actions : compléter le profil, modifier la routine, rejoindre une entreprise.

### Tests de tranche

23. Tests unitaires des validations.
24. Tests providers/controllers.
25. Tests widgets du tunnel.
26. Tests d’intégration avec Emulator Suite.
27. Tests Rules : utilisateur, données privées, invitation et trajet habituel.

Critère d’acceptation : un salarié neuf peut créer son compte, vérifier son email, reprendre un onboarding interrompu, rejoindre une entreprise valide, enregistrer son trajet habituel puis voir uniquement ses données réelles sur le dashboard.

## P3 — Entreprises et invitations

1. Onboarding entreprise en statut `trial` ou `pending`.
2. Établissements et points de rencontre.
3. Gestionnaires via custom claims et membership.
4. Invitations email et codes à durée limitée.
5. Acceptation sécurisée et idempotente.
6. Liste des salariés et états d’invitation.
7. Première vue agrégée sans métriques inventées.

## P4 — Véhicules et conformité conducteur

1. CRUD avec suppression logique.
2. Véhicule principal et équipements.
3. Photos et documents Storage.
4. Dates d’expiration et rappels.
5. Statut de vérification modifiable uniquement côté serveur/admin.
6. Tests Storage Rules.

## P5 — Trajets et récurrence

1. `RideTemplate` complet.
2. `RideOccurrence` datée.
3. Fonction idempotente de génération d’occurrences.
4. Ponctuel, récurrent, aller, retour et aller-retour.
5. Pause, duplication et annulation série/occurrence.
6. Google Maps, Places, Routes et consentement localisation.

## P6 — Matching et réservation

1. Interface de moteur de matching.
2. Algorithme déterministe documenté et testé.
3. Raisons du score affichées.
4. Recherche et résultats réels.
5. Machine à états Booking côté serveur.
6. Réservation transactionnelle sans surréservation.
7. Acceptation, refus, annulation et historique.

## P7 — Coordination du trajet

1. Conversations liées aux réservations.
2. Messages texte et rapides.
3. Rules vérifiant l’appartenance à la conversation.
4. FCM, préférences et deep links.
5. Statuts d’approche et retard.
6. Position temporaire consentie avec expiration.

## P8 — Confiance, sécurité et support

1. Évaluations après trajet terminé uniquement.
2. Contact d’urgence et partage du trajet.
3. SOS avec limites explicites.
4. Blocage et signalement.
5. Workflow de modération.
6. FAQ et tickets support.
7. Journal d’audit administratif.

## P9 — Entreprise avancée

1. Budgets et subventions configurables.
2. Campagnes.
3. Agrégats calculés côté serveur.
4. Rapports CSV/PDF.
5. Plans Essentiel, Business et Enterprise pilotés par configuration.
6. Abonnements entreprise.

## P10 — Paiements

1. Contrats `PaymentProvider`, `PaymentRepository`, `PayoutRepository` et `SubsidyService`.
2. Calcul serveur du prix final.
3. Autorisation, capture, remboursement et reçu.
4. Webhooks idempotents.
5. Portefeuille et virements conducteur.
6. Journal financier et tests de sécurité.

## P11 — Premium, récompenses et administration

1. Premium mensuel/annuel et droits configurables.
2. Restauration et annulation.
3. Points, badges et récompenses attribués côté serveur.
4. Dashboard administrateur.
5. Vérifications, modération, support et configuration.

## P12 — Préparation bêta et stores

1. Tests de bout en bout prioritaires.
2. Audit Rules, App Check et secrets.
3. Performance et Crashlytics.
4. Audit accessibilité et RTL.
5. Politique de confidentialité et suppression de compte.
6. Builds signés staging et production.
7. Bêta privée, monitoring et plan de retour arrière.
