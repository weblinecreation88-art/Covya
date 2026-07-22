"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, db, firebaseReady } from "@/lib/firebase";
import type { AccountType, MobilityRole, UserProfile } from "@/lib/types";

interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
  accountType: AccountType;
  mobilityRole: MobilityRole;
  companyName?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(uid: string) {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setProfile(currentUser ? await loadProfile(currentUser.uid) : null);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase n’est pas configuré.");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    if (!auth || !db) throw new Error("Firebase n’est pas configuré.");
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password,
    );

    await updateProfile(credential.user, { displayName: input.displayName });
    const userProfile: Omit<UserProfile, "createdAt" | "updatedAt"> = {
      uid: credential.user.uid,
      displayName: input.displayName,
      email: input.email,
      accountType: input.accountType,
      mobilityRole: input.mobilityRole,
      ...(input.companyName ? { companyName: input.companyName } : {}),
    };

    await setDoc(doc(db, "users", credential.user.uid), {
      ...userProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setProfile(userProfile as UserProfile);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth || !db) throw new Error("Firebase n’est pas configuré.");
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const profileRef = doc(db, "users", credential.user.uid);
    const existing = await getDoc(profileRef);

    if (!existing.exists()) {
      const userProfile = {
        uid: credential.user.uid,
        displayName: credential.user.displayName ?? "Membre Covya",
        email: credential.user.email ?? "",
        accountType: "employee" as const,
        mobilityRole: "passenger" as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(profileRef, userProfile);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured: firebaseReady,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [user, profile, loading, signIn, signUp, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans AuthProvider.");
  return context;
}
