"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { clearPageCache } from "@/components/pwa/service-worker";
import { cx } from "@/components/ui";

export function LogoutButton({ variant = "icon" }: { variant?: "icon" | "full" }) {
  return (
    <form action={logoutAction} onSubmit={() => clearPageCache()}>
      <button
        type="submit"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className={cx(
          "inline-flex items-center gap-2 rounded-xl text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600",
          variant === "icon" ? "size-9 justify-center" : "h-10 px-3",
        )}
      >
        <LogOut className="size-[18px]" aria-hidden />
        {variant === "full" && "Se déconnecter"}
      </button>
    </form>
  );
}
