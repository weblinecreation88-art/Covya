"use client";

import { ArrowUpRight, BarChart3, CalendarRange, CarFront, Download, Leaf, Plus, TrendingUp, Users, WalletCards } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";

export default function CompanyPage() {
  const { profile } = useAuth();
  return (
    <ProtectedRoute accountType="company_admin">
      <AppShell company>
        <div className="page-heading-row company-heading">
          <div><span className="eyebrow">Pilotage mobilité</span><h1>{profile?.companyName ?? "Mon entreprise"}</h1><p>Suivez l’adoption et préparez votre première campagne Covya.</p></div>
          <div className="heading-actions"><button className="button button-ghost-dark"><Download size={17} /> Exporter</button><button className="button button-primary"><Plus size={17} /> Inviter des salariés</button></div>
        </div>

        <div className="company-filterbar"><span><CalendarRange /> 30 derniers jours</span><span>Tous les sites</span><small>Données de démarrage</small></div>

        <section className="company-kpis">
          <article><span><Users /></span><div><small>Salariés actifs</small><strong>0</strong><em>Invitez votre équipe</em></div></article>
          <article><span><CarFront /></span><div><small>Trajets complétés</small><strong>0</strong><em>Ce mois-ci</em></div></article>
          <article><span><WalletCards /></span><div><small>Budget mobilité</small><strong>0 MAD</strong><em>Aucune règle active</em></div></article>
          <article><span><Leaf /></span><div><small>CO₂ évité</small><strong>0 kg</strong><em>Méthode transparente</em></div></article>
        </section>

        <div className="company-dashboard-grid">
          <section className="company-panel mobility-chart-panel">
            <div className="panel-head"><div><h2>Adoption de Covya</h2><p>L’activité apparaîtra après les premières invitations.</p></div><span><TrendingUp /> Évolution</span></div>
            <div className="empty-chart"><BarChart3 /><strong>Vos indicateurs sont prêts</strong><p>Invitez des salariés pour suivre les inscriptions et les trajets complétés.</p></div>
          </section>
          <section className="company-panel next-actions-panel">
            <div className="panel-head"><div><h2>Prochaines étapes</h2><p>Configurez votre programme.</p></div></div>
            <ol>
              <li><span>1</span><div><strong>Inviter les salariés</strong><small>Ajoutez leurs emails professionnels.</small></div><ArrowUpRight /></li>
              <li><span>2</span><div><strong>Créer une subvention</strong><small>Définissez un budget et des plafonds.</small></div><ArrowUpRight /></li>
              <li><span>3</span><div><strong>Lancer une campagne</strong><small>Présentez Covya à vos équipes.</small></div><ArrowUpRight /></li>
            </ol>
          </section>
        </div>

        <section className="company-panel privacy-panel">
          <span><Leaf /></span><div><h2>Impact mesurable, confidentialité préservée</h2><p>Les tableaux Covya utilisent des données agrégées. Les adresses personnelles, les messages et la position en temps réel ne sont jamais exposés aux RH.</p></div>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}
