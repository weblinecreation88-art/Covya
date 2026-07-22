import type { Timestamp } from "firebase/firestore";

export type AccountType = "employee" | "company_admin";
export type MobilityRole = "passenger" | "driver" | "both";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  accountType: AccountType;
  mobilityRole: MobilityRole;
  companyName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  departureAt: Timestamp;
  seats: number;
  price: number;
  currency: string;
  status: "published" | "full" | "cancelled" | "completed";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

