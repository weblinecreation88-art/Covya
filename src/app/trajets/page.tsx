"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowRightLeft, CalendarClock, CarFront, LoaderCircle, MapPin, Plus, Search, Users, WalletCards, X } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";
import { LiveRides } from "@/components/dashboard/live-rides";
import { createRide } from "@/lib/rides";

export default function RidesPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(15);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canDrive = useMemo(() => profile?.mobilityRole === "driver" || profile?.mobilityRole === "both", [profile]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setMessage("");
    setSaving(true);
    try {
      await createRide(profile, { origin, destination, departureAt: new Date(departureAt), seats, price });
      setMessage("Trajet publié avec succès.");
      setOrigin(""); setDestination(""); setDepartureAt("");
      window.setTimeout(() => setShowForm(false), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de publier ce trajet.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute accountType="employee">
      <AppShell>
        <div className="page-heading-row">
          <div><span className="eyebrow">Marketplace Covya</span><h1>Trouvez votre trajet</h1><p>Recherchez parmi les départs proposés par les salariés.</p></div>
          {canDrive && <button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Proposer un trajet</button>}
        </div>

        <section className="ride-search-panel">
          <div className="ride-search-field"><MapPin /><span><small>Départ ou destination</small><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex. Oulfa, Technopark…" /></span></div>
          <div className="ride-search-filter"><CalendarClock /><span><small>Date</small><strong>Prochains départs</strong></span></div>
          <div className="ride-search-filter"><Users /><span><small>Places</small><strong>1 passager</strong></span></div>
          <button aria-label="Rechercher"><Search /></button>
        </section>

        {!canDrive && <div className="driver-callout"><span><CarFront /></span><div><strong>Vous avez aussi une voiture ?</strong><p>Activez le rôle conducteur dans votre profil pour proposer des places.</p></div></div>}

        <section className="dashboard-section">
          <div className="dashboard-section-head"><div><h2>Prochains trajets</h2><p>Résultats mis à jour en temps réel depuis Firestore.</p></div></div>
          <LiveRides search={search} limit={30} />
        </section>

        {showForm && (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setShowForm(false)}>
            <section className="ride-modal" role="dialog" aria-modal="true" aria-labelledby="ride-modal-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-head"><div><span className="eyebrow">Conducteur</span><h2 id="ride-modal-title">Proposer un trajet</h2></div><button aria-label="Fermer" onClick={() => setShowForm(false)}><X /></button></div>
              <form onSubmit={handleCreate}>
                {message && <div className={message.includes("succès") ? "form-success" : "form-error"}>{message}</div>}
                <div className="route-form-pair">
                  <label className="field"><span>Point de départ</span><span className="input-wrap"><MapPin size={18} /><input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Quartier ou adresse" required /></span></label>
                  <ArrowRightLeft className="route-swap" />
                  <label className="field"><span>Destination</span><span className="input-wrap"><MapPin size={18} /><input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Site de travail" required /></span></label>
                </div>
                <label className="field"><span>Date et heure de départ</span><span className="input-wrap"><CalendarClock size={18} /><input type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} required /></span></label>
                <div className="form-columns">
                  <label className="field"><span>Places disponibles</span><span className="input-wrap"><Users size={18} /><input type="number" min="1" max="8" value={seats} onChange={(event) => setSeats(Number(event.target.value))} required /></span></label>
                  <label className="field"><span>Participation par place</span><span className="input-wrap"><WalletCards size={18} /><input type="number" min="0" step="1" value={price} onChange={(event) => setPrice(Number(event.target.value))} required /><b>MAD</b></span></label>
                </div>
                <div className="modal-actions"><button className="button button-ghost-dark" type="button" onClick={() => setShowForm(false)}>Annuler</button><button className="button button-primary" disabled={saving} type="submit">{saving ? <><LoaderCircle className="spin" size={18} /> Publication…</> : "Publier le trajet"}</button></div>
              </form>
            </section>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
