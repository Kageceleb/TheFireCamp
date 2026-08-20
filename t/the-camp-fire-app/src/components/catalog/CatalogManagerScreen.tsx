import { useState } from "react";
import ItemsCatalogTab from "./ItemsCatalogTab";
import SpellsCatalogTab from "./SpellsCatalogTab";
import ClassesCatalogTab from "./ClassesCatalogTab";

interface CatalogManagerScreenProps {
  onBack: () => void;
}

type Tab = "items" | "spells" | "classes";

/**
 * Tip: the DM catalog management screen. These catalogs are GLOBAL —
 * shared across every campaign, not scoped to the one the DM opened
 * this from (per spec: items/spells/classes are DM-extensible reference
 * data, reused everywhere) — so changes made here show up for every
 * campaign this DM (or any DM) runs, not just this one.
 */
export default function CatalogManagerScreen({ onBack }: CatalogManagerScreenProps) {
  const [tab, setTab] = useState<Tab>("items");

  return (
    <div className="min-h-screen w-full px-4 py-8" style={{ background: "radial-gradient(ellipse at top, #1c1a17 0%, #121110 65%)" }}>
      <style>{`* { font-family: 'Inter', sans-serif; }`}</style>
      <div className="mx-auto max-w-4xl">
        <button onClick={onBack} className="mb-4 text-sm" style={{ color: "#a89a7d" }}>
          &larr; Back
        </button>

        <h1 className="mb-1 text-xl tracking-wide" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
          Catalog
        </h1>
        <p className="mb-6 text-xs" style={{ color: "#5f5947" }}>
          Global reference data, shared across every campaign.
        </p>

        <div className="mb-6 flex gap-2">
          {(["items", "spells", "classes"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className="rounded-full px-3.5 py-1.5 text-sm capitalize tracking-wide"
              style={{
                background: tab === option ? "#E2A052" : "#1e1c19",
                color: tab === option ? "#121110" : "#a89a7d",
                border: `1px solid ${tab === option ? "#E2A052" : "#3D2B1D"}`,
                fontWeight: tab === option ? 600 : 400,
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {tab === "items" && <ItemsCatalogTab />}
        {tab === "spells" && <SpellsCatalogTab />}
        {tab === "classes" && <ClassesCatalogTab />}
      </div>
    </div>
  );
}
