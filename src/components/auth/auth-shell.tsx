import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Check, Leaf, ShieldCheck, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-inner">
          <BrandLogo />
          <div className="auth-promise">
            <span className="hero-kicker"><Leaf size={16} /> La mobilité des équipes</span>
            <h1>Ensemble, allons plus loin.</h1>
            <p>Rejoignez une communauté de salariés qui partagent leurs trajets en toute simplicité.</p>
            <ul>
              <li><span><Users /></span><div><strong>Des collègues vérifiés</strong><small>Retrouvez les membres de votre entreprise.</small></div></li>
              <li><span><ShieldCheck /></span><div><strong>La confiance intégrée</strong><small>Profils, avis et règles claires.</small></div></li>
              <li><span><Check /></span><div><strong>Des trajets plus fiables</strong><small>Rappels et coordination au bon moment.</small></div></li>
            </ul>
          </div>
          <p className="auth-quote">« Covya a simplifié les trajets de toute notre équipe. » <strong>— Sarah, RH</strong></p>
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <Link className="back-link" href="/"><ArrowLeft size={17} /> Retour à l’accueil</Link>
          <div className="auth-heading"><h2>{title}</h2><p>{subtitle}</p></div>
          {children}
        </div>
      </section>
    </main>
  );
}
