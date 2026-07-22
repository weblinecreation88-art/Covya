"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CarFront, Heart, History, Leaf, Plus, Search, ShieldCheck, Sparkles } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";
import { LiveRides } from "@/components/dashboard/live-rides";

export default function DashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.displayName?.split(" ")[0] ?? "membre";

  return (
    <ProtectedRoute accountType="employee">
      <AppShell>
        <div className="page-heading-row">
          <div><span className="eyebrow">Espace salarié</span><h1>Bonjour {firstName} <span>👋</span></h1><p>Prêt pour votre prochain trajet domicile-travail ?</p></div>
          <Link className="button button-primary" href="/trajets"><Plus size={18} /> Proposer un trajet</Link>
        </div>

        <section className="dashboard-hero-card">
          <div>
            <span className="dashboard-pill"><Sparkles size={15} /> Recherche intelligente</span>
            <h2>Où allez-vous aujourd’hui ?</h2>
            <p>Trouvez un collègue qui part dans la même direction.</p>
          </div>
          <Link className="dashboard-search-box" href="/trajets"><Search /><span><small>Rechercher un trajet</small><strong>Départ, destination ou site</strong></span><ArrowRight /></Link>
          <div className="dashboard-hero-art" aria-hidden="true"><span><CarFront /></span><i /><b /><i /></div>
        </section>

        <div className="quick-actions">
          <Link href="/trajets"><span><Search /></span><div><strong>Rechercher</strong><small>Un trajet disponible</small></div><ArrowRight /></Link>
          <Link href="/trajets"><span><CalendarDays /></span><div><strong>Mes trajets</strong><small>À venir et passés</small></div><ArrowRight /></Link>
          <Link href="/trajets"><span><Heart /></span><div><strong>Favoris</strong><small>Vos trajets enregistrés</small></div><ArrowRight /></Link>
          <Link href="/trajets"><span><History /></span><div><strong>Historique</strong><small>Reçus et impact</small></div><ArrowRight /></Link>
        </div>

        <section className="dashboard-section">
          <div className="dashboard-section-head"><div><h2>Trajets disponibles</h2><p>Les prochains départs proposés par votre communauté.</p></div><Link href="/trajets">Tout afficher <ArrowRight size={16} /></Link></div>
          <LiveRides limit={3} />
        </section>

        <section className="personal-impact">
          <div className="impact-copy"><span><Leaf /></span><div><small>Votre impact commence maintenant</small><h2>Chaque siège partagé compte.</h2><p>Publiez ou réservez votre premier trajet pour suivre vos économies et le CO₂ évité.</p></div></div>
          <div className="impact-metrics"><div><strong>0 kg</strong><small>CO₂ évité</small></div><div><strong>0 MAD</strong><small>économisés</small></div><div><strong>—</strong><small>trajets complétés</small></div></div>
          <span className="impact-trust"><ShieldCheck /> Les indicateurs restent personnels</span>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}

