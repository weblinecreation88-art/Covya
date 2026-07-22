"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "./auth-provider";
import type { AccountType } from "@/lib/types";

export function ProtectedRoute({
  children,
  accountType,
}: {
  children: ReactNode;
  accountType?: AccountType;
}) {
  const router = useRouter();
  const { user, profile, loading, configured } = useAuth();

  useEffect(() => {
    if (!loading && configured && !user) router.replace("/connexion");
  }, [configured, loading, router, user]);

  if (!configured) {
    return (
      <div className="centered-state">
        <span className="eyebrow">Configuration requise</span>
        <h1>Connectez votre projet Firebase</h1>
        <p>Renseignez les variables de <code>.env.local</code>, puis relancez l’application.</p>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="centered-state" aria-live="polite">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>Chargement de votre espace…</p>
      </div>
    );
  }

  if (accountType && profile && profile.accountType !== accountType) {
    return (
      <div className="centered-state">
        <span className="eyebrow">Accès réservé</span>
        <h1>Cet espace ne correspond pas à votre compte</h1>
        <p>Utilisez l’espace salarié ou contactez l’administrateur de votre entreprise.</p>
      </div>
    );
  }

  return children;
}

