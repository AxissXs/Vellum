"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, EyeOff } from "lucide-react";

export default function ImpersonationBanner({ targetName }: { targetName: string }) {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  async function stopImpersonation() {
    setStopping(true);
    try {
      const res = await fetch("/api/super-admin/impersonate/stop", { method: "POST" });
      if (res.ok) {
        window.location.href = "/dashboard/super-admin";
      }
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <EyeOff size={16} className="text-amber-400" />
        <span className="text-amber-300 font-medium">Impersonating {targetName}</span>
        <span className="text-amber-400/60">— you are seeing the app as this user</span>
      </div>
      <button
        onClick={stopImpersonation}
        disabled={stopping}
        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-2"
      >
        {stopping ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
        Stop Impersonating
      </button>
    </div>
  );
}
