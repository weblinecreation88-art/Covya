# Covya Web

Application Next.js 16 déployée sur Firebase App Hosting. Firebase Authentication gère les comptes et Cloud Firestore stocke les profils et les trajets.

## Configuration

1. Créer un projet Firebase dédié à Covya.
2. Activer Authentication → Email/Password et Google.
3. Créer une base Firestore en mode production.
4. Copier `.env.example` vers `.env.local` et renseigner la configuration Web Firebase.
5. Connecter le dépôt GitHub au backend Firebase App Hosting et sélectionner la branche `main`.
6. Vérifier que le répertoire racine du backend pointe sur la racine de ce dépôt, là où se trouvent `package.json` et `next.config.ts`.

## Commandes

```bash
npm install
npm run dev
npm run lint
npm run build
```

Le build de production génère une sortie serveur autonome dans `.next/standalone/`. Firebase App Hosting construit et déploie automatiquement chaque commit envoyé sur `main`.

Les règles et index Firestore restent déployables séparément avec :

```bash
npx firebase-tools deploy --only firestore
```
