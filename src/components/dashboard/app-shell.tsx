"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CarFront,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  MessageCircleMore,
  Plus,
  Search,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth/auth-provider";

const employeeNav = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/trajets", label: "Trajets", icon: CarFront },
  { href: "/trajets", label: "Calendrier", icon: CalendarDays },
  { href: "/dashboard", label: "Messages", icon: MessageCircleMore },
];

const companyNav = [
  { href: "/entreprise", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/entreprise", label: "Employés", icon: Users },
  { href: "/entreprise", label: "Mobilité", icon: CarFront },
  { href: "/entreprise", label: "Subventions", icon: WalletCards },
  { href: "/entreprise", label: "Impact", icon: Leaf },
  { href: "/entreprise", label: "Rapports", icon: BarChart3 },
];

export function AppShell({ children, company = false }: { children: ReactNode; company?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const navItems = company ? companyNav : employeeNav;

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <BrandLogo />
        <nav aria-label={company ? "Navigation entreprise" : "Navigation salarié"}>
          <span className="nav-section">Espace {company ? "entreprise" : "personnel"}</span>
          {navItems.map(({ href, label, icon: Icon }, index) => (
            <Link className={pathname === href && index === 0 ? "active" : ""} href={href} key={`${label}-${index}`}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        {!company && <Link className="sidebar-create" href="/trajets"><Plus /> Proposer un trajet</Link>}
        <div className="sidebar-bottom">
          <Link href={company ? "/entreprise" : "/dashboard"}><CircleHelp size={19} /><span>Aide</span></Link>
          <Link href={company ? "/entreprise" : "/dashboard"}><Settings size={19} /><span>Paramètres</span></Link>
          <button onClick={handleSignOut}><LogOut size={19} /><span>Déconnexion</span></button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button className="mobile-menu" aria-label="Ouvrir le menu"><Menu /></button>
          <div className="app-search"><Search size={17} /><span>Rechercher dans Covya…</span><kbd>⌘ K</kbd></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            {company && <span className="company-switch"><Building2 size={16} /> {profile?.companyName ?? "Mon entreprise"}<ChevronDown size={14} /></span>}
            <button className="profile-button">
              <span>{(profile?.displayName ?? user?.displayName ?? "WR").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
              <div><strong>{profile?.displayName ?? user?.displayName ?? "Membre Covya"}</strong><small>{company ? "Administrateur mobilité" : "Profil salarié"}</small></div>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
