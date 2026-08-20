import { useEffect, useState } from "react";
import { isRunningInTaleSpire, waitForSymbioteReady } from "../lib/symbiote/client";

type Status = "checking" | "connected" | "standalone";

/**
 * Tip: mostly here so you can visually confirm, at a glance, whether
 * this build has actually connected to TaleSpire or is running
 * standalone in a normal browser (e.g. `npm run dev`) — a real, honest
 * status rather than something that just assumes success.
 */
export default function SymbioteStatusBadge() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (!isRunningInTaleSpire()) {
      setStatus("standalone");
      return;
    }
    // If we get here we're definitely in TaleSpire, so once this
    // resolves it can only be because hasInitialized actually fired.
    waitForSymbioteReady().then(() => setStatus("connected"));
  }, []);

  const label =
    status === "checking" ? "Checking…" : status === "connected" ? "Connected to TaleSpire" : "Standalone (not in TaleSpire)";
  const color = status === "connected" ? "#4a7c74" : status === "standalone" ? "#8a7d63" : "#a89a7d";

  return (
    <span className="text-[10px] uppercase tracking-widest" style={{ color }}>
      ● {label}
    </span>
  );
}
