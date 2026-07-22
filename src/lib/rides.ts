import {
  Timestamp,
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Ride, UserProfile } from "@/lib/types";

export interface CreateRideInput {
  origin: string;
  destination: string;
  departureAt: Date;
  seats: number;
  price: number;
}

export function subscribeToPublishedRides(
  onData: (rides: Ride[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError(new Error("Firebase n’est pas configuré."));
    return () => undefined;
  }

  const ridesQuery = query(
    collection(db, "rides"),
    where("status", "==", "published"),
    where("departureAt", ">=", Timestamp.now()),
    orderBy("departureAt", "asc"),
    limit(30),
  );

  return onSnapshot(
    ridesQuery,
    (snapshot) => {
      onData(snapshot.docs.map((rideDoc) => ({ id: rideDoc.id, ...rideDoc.data() }) as Ride));
    },
    onError,
  );
}

export async function createRide(profile: UserProfile, input: CreateRideInput) {
  if (!db) throw new Error("Firebase n’est pas configuré.");
  if (input.departureAt.getTime() <= Date.now()) {
    throw new Error("Choisissez une date de départ dans le futur.");
  }

  await addDoc(collection(db, "rides"), {
    driverId: profile.uid,
    driverName: profile.displayName,
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    departureAt: Timestamp.fromDate(input.departureAt),
    seats: input.seats,
    price: input.price,
    currency: "MAD",
    status: "published",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

