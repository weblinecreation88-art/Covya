"use client";

import { useEffect, useMemo, useState } from "react";
import { CarFront, LoaderCircle } from "lucide-react";
import { subscribeToPublishedRides } from "@/lib/rides";
import type { Ride } from "@/lib/types";
import { RideCard } from "./ride-card";

export function LiveRides({ search = "", limit = 6 }: { search?: string; limit?: number }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToPublishedRides(
      (nextRides) => { setRides(nextRides); setLoading(false); },
      (nextError) => { setError(nextError.message); setLoading(false); },
    );
  }, []);

  const filteredRides = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("fr");
    const result = normalized
      ? rides.filter((ride) => `${ride.origin} ${ride.destination}`.toLocaleLowerCase("fr").includes(normalized))
      : rides;
    return result.slice(0, limit);
  }, [limit, rides, search]);

  if (loading) return <div className="inline-state"><LoaderCircle className="spin" /> Recherche des trajets disponibles…</div>;
  if (error) return <div className="inline-state error"><CarFront /> Impossible de charger les trajets. {error}</div>;
  if (!filteredRides.length) return <div className="empty-rides"><span><CarFront /></span><h3>Aucun trajet disponible pour le moment</h3><p>Proposez le premier trajet ou revenez après l’invitation de vos collègues.</p></div>;

  return <div className="rides-grid">{filteredRides.map((ride) => <RideCard key={ride.id} ride={ride} />)}</div>;
}

