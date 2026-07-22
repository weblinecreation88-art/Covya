"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { getFriendlyFirebaseError } from "@/lib/firebase-errors";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError("Firebase n’est pas encore configuré. Ajoutez les variables dans .env.local.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (submitError) {
      setError(getFriendlyFirebaseError(submitError));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    if (!configured) {
      setError("Firebase n’est pas encore configuré. Ajoutez les variables dans .env.local.");
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (submitError) {
      setError(getFriendlyFirebaseError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Bon retour parmi nous" subtitle="Connectez-vous pour retrouver vos prochains trajets.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {!configured && <div className="config-alert">Firebase est prêt côté code. Renseignez <code>.env.local</code> pour activer la connexion.</div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <label className="field">
          <span>Adresse email</span>
          <span className="input-wrap"><Mail size={18} /><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.com" required /></span>
        </label>
        <label className="field">
          <span className="field-label-row"><span>Mot de passe</span><span>Mot de passe oublié ?</span></span>
          <span className="input-wrap"><input autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
        </label>
        <button className="button button-primary button-large button-full" disabled={loading} type="submit">
          {loading ? <><LoaderCircle className="spin" size={19} /> Connexion…</> : "Se connecter"}
        </button>
        <div className="auth-divider"><span>ou continuer avec</span></div>
        <button className="social-button" disabled={loading} type="button" onClick={handleGoogle}><span className="google-g">G</span> Google</button>
        <p className="auth-switch">Pas encore de compte ? <Link href="/inscription">Créer un compte</Link></p>
      </form>
    </AuthShell>
  );
}

