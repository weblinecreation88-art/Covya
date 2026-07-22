import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Leaf,
  MapPin,
  Menu,
  MessageCircleMore,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  WalletCards,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  {
    icon: Route,
    title: "Matching intelligent",
    text: "Des trajets classés selon votre horaire, le détour et le point de rendez-vous.",
  },
  {
    icon: ShieldCheck,
    title: "Communauté vérifiée",
    text: "Profils liés à leur entreprise, avis utiles et outils de sécurité intégrés.",
  },
  {
    icon: WalletCards,
    title: "Paiement simple",
    text: "Partage des frais transparent et subventions entreprise appliquées automatiquement.",
  },
  {
    icon: MessageCircleMore,
    title: "Coordination fluide",
    text: "Chat lié au trajet, rappels et informations de rendez-vous au bon moment.",
  },
];

const steps = [
  ["01", "Indiquez votre trajet", "Ajoutez votre point de départ, votre site et vos horaires habituels."],
  ["02", "Choisissez votre match", "Comparez l’heure, le détour, les places et le profil du conducteur."],
  ["03", "Roulez ensemble", "Réservez, échangez dans le chat et retrouvez-vous en toute simplicité."],
];

export default function HomePage() {
  return (
    <main>
      <section className="hero" id="accueil">
        <nav className="site-nav container" aria-label="Navigation principale">
          <BrandLogo />
          <div className="nav-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#entreprises">Entreprises</a>
            <a href="#impact">Impact</a>
          </div>
          <div className="nav-actions">
            <Link className="button button-ghost" href="/connexion">Se connecter</Link>
            <Link className="button button-light" href="/inscription">Créer un compte</Link>
          </div>
          <Link className="nav-menu" href="/connexion" aria-label="Ouvrir la connexion">
            <Menu />
          </Link>
        </nav>

        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <div className="hero-grid container">
          <div className="hero-copy">
            <span className="hero-kicker"><Sparkles size={16} /> La mobilité qui rapproche les équipes</span>
            <h1>Le trajet vers le travail devient <em>plus simple.</em></h1>
            <p>
              Covya connecte les collègues qui vont dans la même direction.
              Moins de frais, moins de stress et plus de fiabilité au quotidien.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/inscription">
                Trouver mon trajet <ArrowRight size={18} />
              </Link>
              <a className="button button-ghost-light button-large" href="#fonctionnement">
                Découvrir Covya
              </a>
            </div>
            <div className="hero-trust">
              <div className="avatar-stack" aria-hidden="true">
                <span>YA</span><span>AM</span><span>SK</span><span>+2k</span>
              </div>
              <div><strong>Déjà adopté par des équipes</strong><span><Star size={14} fill="currentColor" /> 4,9/5 de satisfaction pilote</span></div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Aperçu du tableau de bord Covya">
            <div className="dashboard-preview">
              <div className="preview-topbar">
                <span className="preview-dots"><i /><i /><i /></span>
                <span className="preview-search"><Search size={13} /> Rechercher</span>
                <span className="preview-avatar">YB</span>
              </div>
              <div className="preview-body">
                <aside className="preview-sidebar">
                  <BrandLogo compact />
                  <span className="active"><CarFront size={16} /></span>
                  <span><CalendarDays size={16} /></span>
                  <span><MessageCircleMore size={16} /></span>
                  <span><Users size={16} /></span>
                </aside>
                <div className="preview-content">
                  <div className="preview-welcome">
                    <div><small>Bonjour Yassine 👋</small><strong>Prêt pour le trajet ?</strong></div>
                    <span><BadgeCheck size={16} /> Profil vérifié</span>
                  </div>
                  <div className="today-card">
                    <div className="today-heading"><span>Votre trajet du jour</span><strong>07:45</strong></div>
                    <div className="route-row">
                      <span className="route-points"><i /><b /><i /></span>
                      <div><strong>Oulfa, Casablanca</strong><small>18 min · prise en charge</small><strong>Technopark</strong></div>
                    </div>
                    <div className="driver-row">
                      <span className="driver-avatar">AE</span>
                      <div><strong>Ahmed El.</strong><small><Star size={11} fill="currentColor" /> 4,9 · 126 trajets</small></div>
                      <button>Voir le trajet</button>
                    </div>
                  </div>
                  <div className="preview-stats">
                    <div><Leaf size={18} /><span><strong>8,4 kg</strong><small>CO₂ évité ce mois</small></span></div>
                    <div><Coins size={18} /><span><strong>340 MAD</strong><small>économisés</small></span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-card float-match">
              <span><Check size={16} /></span>
              <div><strong>Match trouvé !</strong><small>92 % compatible</small></div>
            </div>
            <div className="floating-card float-impact">
              <Leaf size={18} />
              <div><strong>−24 %</strong><small>d’émissions</small></div>
            </div>
          </div>
        </div>
        <div className="hero-wave" />
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <span>Une mobilité pensée pour</span>
          <strong><Building2 /> Entreprises engagées</strong>
          <strong><Users /> Équipes connectées</strong>
          <strong><Leaf /> Trajets responsables</strong>
          <strong><ShieldCheck /> Communautés sûres</strong>
        </div>
      </section>

      <section className="section" id="fonctionnalites">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">Pensé pour le quotidien</span>
            <h2>Tout ce qu’il faut pour arriver <em>sereinement</em></h2>
            <p>Une expérience claire pour rechercher, réserver et partager vos trajets récurrents.</p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="feature-card" key={title}>
                <span className="feature-icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href="/inscription">Commencer <ChevronRight size={16} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft" id="fonctionnement">
        <div className="container split-section">
          <div className="map-card" aria-hidden="true">
            <div className="map-grid" />
            <span className="map-road road-one" />
            <span className="map-road road-two" />
            <span className="map-pin pin-home"><MapPin /></span>
            <span className="map-pin pin-work"><Building2 /></span>
            <span className="map-car"><CarFront /></span>
            <div className="map-info"><Clock3 /><span><strong>18 minutes</strong><small>Oulfa → Technopark</small></span></div>
          </div>
          <div className="steps-copy">
            <span className="eyebrow">Comment ça marche ?</span>
            <h2>Votre prochain trajet en <em>trois étapes</em></h2>
            <div className="steps-list">
              {steps.map(([number, title, text]) => (
                <div className="step" key={number}>
                  <span>{number}</span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </div>
              ))}
            </div>
            <Link className="text-link" href="/inscription">Créer mon profil <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="section enterprise-section" id="entreprises">
        <div className="container enterprise-grid">
          <div className="enterprise-copy">
            <span className="eyebrow eyebrow-dark">Covya pour les entreprises</span>
            <h2>Faites de la mobilité un <em>avantage salarié.</em></h2>
            <p>Invitez vos équipes, financez les trajets utiles et mesurez l’impact sans surveiller les déplacements individuels.</p>
            <ul>
              <li><Check /> Invitations et communautés d’entreprise</li>
              <li><Check /> Budgets et subventions configurables</li>
              <li><Check /> Indicateurs agrégés et rapports d’impact</li>
            </ul>
            <Link className="button button-primary button-large" href="/inscription?type=company_admin">
              Découvrir l’espace entreprise <ArrowRight size={18} />
            </Link>
          </div>
          <div className="analytics-card">
            <div className="analytics-head"><div><small>Vue d’ensemble</small><strong>Mobilité · Juillet</strong></div><span>30 jours⌄</span></div>
            <div className="kpi-grid">
              <div><span><Users /></span><strong>428</strong><small>salariés actifs</small><em>+18 %</em></div>
              <div><span><CarFront /></span><strong>1 284</strong><small>trajets partagés</small><em>+24 %</em></div>
              <div><span><Leaf /></span><strong>2,8 t</strong><small>CO₂ évité</small><em>+31 %</em></div>
            </div>
            <div className="chart-card">
              <div><strong>Trajets complétés</strong><small>6 derniers mois</small></div>
              <div className="bars">{[38, 52, 44, 68, 74, 92].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
              <div className="months"><span>Fév</span><span>Mar</span><span>Avr</span><span>Mai</span><span>Juin</span><span>Juil</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="impact-section" id="impact">
        <div className="container impact-grid">
          <div><strong>32 %</strong><span>de frais de trajet économisés en moyenne</span></div>
          <div><strong>2,4×</strong><span>plus de chances de trouver un trajet dans son entreprise</span></div>
          <div><strong>4,9/5</strong><span>de satisfaction sur les trajets complétés</span></div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-card">
          <div><span className="eyebrow eyebrow-dark">Prêt à rouler ensemble ?</span><h2>Votre prochain trajet commence ici.</h2></div>
          <Link className="button button-primary button-large" href="/inscription">Créer mon compte <ArrowRight /></Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div><BrandLogo /><p>Le covoiturage des salariés, pour des trajets plus simples, économiques et responsables.</p></div>
          <div><strong>Produit</strong><a href="#fonctionnalites">Fonctionnalités</a><a href="#entreprises">Entreprises</a><Link href="/connexion">Connexion</Link></div>
          <div><strong>Confiance</strong><a href="#impact">Impact</a><span>Confidentialité</span><span>Sécurité</span></div>
          <div><strong>Commencer</strong><Link href="/inscription">Créer un compte</Link><Link href="/entreprise">Espace RH</Link></div>
        </div>
        <div className="container footer-bottom"><span>© 2026 Covya</span><span>FR · EN · AR</span></div>
      </footer>
    </main>
  );
}
