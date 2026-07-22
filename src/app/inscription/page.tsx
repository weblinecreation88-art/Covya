"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Building2, CarFront, Eye, EyeOff, LoaderCircle, Mail, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { getFriendlyFirebaseError } from "@/lib/firebase-errors";
import type { AccountType, MobilityRole } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, configured } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("employee");
  const [mobilityRole, setMobilityRole] = useState<MobilityRole>("passenger");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError("Firebase n’est pas encore configuré. Ajoutez les variables dans .env.local.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!accepted) {
      setError("Acceptez les conditions pour continuer.");
      return;
    }

    setLoading(true);
    try {
      await signUp({ displayName, email, password, accountType, mobilityRole, companyName: companyName || undefined });
      router.push(accountType === "company_admin" ? "/entreprise" : "/dashboard");
    } catch (submitError) {
      setError(getFriendlyFirebaseError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Créez votre compte" subtitle="Quelques informations suffisent pour commencer.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {!configured && <div className="config-alert">Renseignez la configuration Firebase dans <code>.env.local</code> pour activer l’inscription.</div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="account-choice" role="group" aria-label="Type de compte">
          <button className={accountType === "employee" ? "selected" : ""} type="button" onClick={() => setAccountType("employee")}><span><UserRound /></span><div><strong>Salarié</strong><small>Conducteur ou passager</small></div></button>
          <button className={accountType === "company_admin" ? "selected" : ""} type="button" onClick={() => setAccountType("company_admin")}><span><Building2 /></span><div><strong>Entreprise</strong><small>RH ou mobilité</small></div></button>
        </div>
        <label className="field"><span>Nom complet</span><span className="input-wrap"><UserRound size={18} /><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Yassine Benali" required /></span></label>
        {accountType === "company_admin" && <label className="field"><span>Entreprise</span><span className="input-wrap"><Building2 size={18} /><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Nom de votre entreprise" required /></span></label>}
        {accountType === "employee" && (
          <label className="field"><span>Je souhaite utiliser Covya comme</span><span className="input-wrap"><CarFront size={18} /><select value={mobilityRole} onChange={(event) => setMobilityRole(event.target.value as MobilityRole)}><option value="passenger">Passager</option><option value="driver">Conducteur</option><option value="both">Les deux</option></select></span></label>
        )}
        <label className="field"><span>Adresse email professionnelle</span><span className="input-wrap"><Mail size={18} /><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.com" required /></span></label>
        <label className="field"><span>Mot de passe</span><span className="input-wrap"><input autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        <label className="check-field"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>J’accepte les conditions d’utilisation et la politique de confidentialité.</span></label>
        <button className="button button-primary button-large button-full" disabled={loading} type="submit">{loading ? <><LoaderCircle className="spin" size={19} /> Création…</> : "Créer mon compte"}</button>
        <p className="auth-switch">Vous avez déjà un compte ? <Link href="/connexion">Se connecter</Link></p>
      </form>
    </AuthShell>
  );
}
