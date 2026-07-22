import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/email-already-in-use": "Un compte existe déjà avec cette adresse email.",
  "auth/invalid-credential": "Email ou mot de passe incorrect.",
  "auth/invalid-email": "Cette adresse email n’est pas valide.",
  "auth/popup-closed-by-user": "La fenêtre de connexion a été fermée.",
  "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
  "auth/weak-password": "Utilisez un mot de passe d’au moins 8 caractères.",
  "permission-denied": "Vous n’avez pas l’autorisation d’effectuer cette action.",
  unavailable: "Le service est momentanément indisponible.",
};

export function getFriendlyFirebaseError(error: unknown) {
  if (error instanceof FirebaseError) {
    return messages[error.code] ?? "Une erreur est survenue. Veuillez réessayer.";
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}

