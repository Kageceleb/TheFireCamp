import { useState } from "react";
import type { CharacterListItem } from "../../lib/supabase/characters";
import JournalCategoryTab from "./JournalCategoryTab";
import PersonalNotesTab from "./PersonalNotesTab";
import HandoutsTab from "./HandoutsTab";

interface JournalScreenProps {
  campaignId: string;
  role: "DM" | "PLAYER";
  myCharacters: CharacterListItem[];
  onBack: () => void;
}

const STANDARD_CATEGORIES = ["Quests", "NPCs", "World Codex", "Locations"] as const;
type Tab = (typeof STANDARD_CATEGORIES)[number] | "Personal Notes" | "Handouts";

/** Tip: the Journal screen, per spec Module 7 — six tabs, two different privacy models underneath (public/dm_only entries in the four standard categories, always-private entries in Personal Notes), plus the separate Handouts gallery from Module 6. */
export default function JournalScreen({ campaignId, role, myCharacters, onBack }: JournalScreenProps) {
  const [tab, setTab] = useState<Tab>("Quests");

  const tabs: Tab[] = [...STANDARD_CATEGORIES, "Personal Notes", "Handouts"];

  return (
    <div className="min-h-screen w-full px-4 py-8" style={{ background: "radial-gradient(ellipse at top, #1c1a17 0%, #121110 65%)" }}>
      <style>{`* { font-family: 'Inter', sans-serif; }`}</style>
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-4 text-sm" style={{ color: "#a89a7d" }}>
          &larr; Back
        </button>

        <h1 className="mb-6 text-xl tracking-wide" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
          Journal
        </h1>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className="rounded-full px-3.5 py-1.5 text-sm tracking-wide"
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

        {STANDARD_CATEGORIES.includes(tab as (typeof STANDARD_CATEGORIES)[number]) && (
          <JournalCategoryTab
            campaignId={campaignId}
            category={tab}
            role={role}
            authorCharacterId={myCharacters[0]?.id ?? null}
          />
        )}
        {tab === "Personal Notes" && <PersonalNotesTab campaignId={campaignId} role={role} myCharacters={myCharacters} />}
        {tab === "Handouts" && <HandoutsTab campaignId={campaignId} role={role} />}
      </div>
    </div>
  );
}
