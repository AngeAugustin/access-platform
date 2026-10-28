"use client";

import { logoutAction } from "@/server/actions/auth";
import { clearPageCache } from "@/components/pwa/service-worker";

export function LogoutButton() {
  return (
    <form action={logoutAction} onSubmit={() => clearPageCache()}>
      <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
        Déconnexion
      </button>
    </form>
  );
}
