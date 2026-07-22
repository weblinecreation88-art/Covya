import Link from "next/link";
import { CarFront, Users } from "lucide-react";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Covya — Accueil">
      <span className="brand-mark" aria-hidden="true">
        <CarFront size={compact ? 22 : 26} />
        <Users className="brand-people" size={compact ? 12 : 14} />
      </span>
      {!compact && (
        <span className="brand-word">
          Cov<span>ya</span>
        </span>
      )}
    </Link>
  );
}
