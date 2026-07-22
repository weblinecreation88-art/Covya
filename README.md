# Covya Web

Application Next.js 16 exportée statiquement et hébergée sur Firebase Hosting. Firebase Authentication gère les comptes et Cloud Firestore stocke les profils et les trajets.

## Configuration

1. Créer un projet Firebase dédié à Covya.
2. Activer Authentication → Email/Password et Google.
3. Créer une base Firestore en mode production.
4. Copier `.env.example` vers `.env.local` et renseigner la configuration Web Firebase.
5. Copier `.firebaserc.example` vers `.firebaserc` et remplacer l'identifiant du projet.

## Commandes

```bash
npm install
npm run dev
npm run lint
npm run build
npx firebase-tools deploy --only firestore,hosting
```

Le build de production est généré dans `out/` puis servi par Firebase Hosting.
