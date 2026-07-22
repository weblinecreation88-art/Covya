import { CalendarDays, MapPin, Star, Users } from "lucide-react";
import type { Ride } from "@/lib/types";

export function RideCard({ ride }: { ride: Ride }) {
  const departure = ride.departureAt.toDate();
  return (
    <article className="ride-card">
      <div className="ride-card-head">
        <span className="ride-driver-avatar">{ride.driverName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
        <div><strong>{ride.driverName}</strong><small><Star size={12} fill="currentColor" /> Nouveau conducteur</small></div>
        <strong className="ride-price">{ride.price} <small>{ride.currency}</small></strong>
      </div>
      <div className="ride-route">
        <span className="ride-route-line"><i /><b /><i /></span>
        <div><strong>{ride.origin}</strong><small>{departure.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · {departure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small><strong>{ride.destination}</strong></div>
      </div>
      <div className="ride-card-foot">
        <span><Users size={15} /> {ride.seats} place{ride.seats > 1 ? "s" : ""}</span>
        <span><CalendarDays size={15} /> Trajet ponctuel</span>
        <button><MapPin size={15} /> Voir le détail</button>
      </div>
    </article>
  );
}

