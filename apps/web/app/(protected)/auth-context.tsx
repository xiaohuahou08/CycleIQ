"use client";

import { createContext, useContext } from "react";

export interface ProtectedAuthValue {
  email: string | null;
  token: string | null;
  isAuthLoading: boolean;
  onLogout: () => Promise<void>;
}

const ProtectedAuthContext = createContext<ProtectedAuthValue | null>(null);

export function ProtectedAuthProvider({
  value,
  children,
}: {
  value: ProtectedAuthValue;
  children: React.ReactNode;
}) {
  return (
    <ProtectedAuthContext.Provider value={value}>
      {children}
    </ProtectedAuthContext.Provider>
  );
}

export function useProtectedAuth() {
  const ctx = useContext(ProtectedAuthContext);
  if (!ctx) {
    throw new Error("useProtectedAuth must be used inside (protected) layout.");
  }
  return ctx;
}
