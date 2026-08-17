import { useEffect, useState } from "react";
import { listCharactersForCampaign, type CharacterListItem } from "../lib/supabase/characters";
import CreateCharacterScreen from "./CreateCharacterScreen";
import CharacterSheet from "./CharacterSheet";
import CatalogManagerScreen from "./catalog/CatalogManagerScreen";
import BagOfHoldingScreen from "./BagOfHoldingScreen";

interface CampaignViewProps {
  campaignId: string;
  campaignName: string;
  role: "DM" | "PLAYER";
  currentUserId: string;
  onBack: () => void;
}

type Screen =
  | { name: "list" }
  | { name: "create" }
  | { name: "sheet"; characterId: string }
  | { name: "catalog" }
  | { name: "bagOfHolding" };

/**
 * Tip: this is the "inside a campaign" screen — it owns navigation
 * between the character list, character creation, and a single
 * character's sheet. It doesn't know how any of those screens work
 * internally, just which one to show.
 */
export default function CampaignView({ campaignId, campaignName, role, currentUserId, onBack }: CampaignViewProps) {
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshCharacters();
  }, [campaignId]);

  async function refreshCharacters() {
    setIsLoading(true);
    try {
      setCharacters(await listCharactersForCampaign(campaignId));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCharacterCreated() {
    setScreen({ name: "list" });
    await refreshCharacters();
  }

  // Rendered standalone, before the shared wrapper below — the catalog's
  // two-column forms want a wider max-w-4xl than every other screen
  // here uses, so nesting it inside that narrower wrapper would just
  // clamp it back down and squish the forms.
  if (screen.name === "catalog") {
    return <CatalogManagerScreen onBack={() => setScreen({ name: "list" })} />;
  }

  if (screen.name === "bagOfHolding") {
    return (
      <BagOfHoldingScreen
        campaignId={campaignId}
        role={role}
        myCharacters={characters.filter((character) => character.ownerUserId === currentUserId)}
        onBack={() => setScreen({ name: "list" })}
      />
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center py-10 px-4"
      style={{ background: "radial-gradient(ellipse at top, #1c1a17 0%, #121110 65%)" }}
    >
      <style>{`* { font-family: 'Inter', sans-serif; }`}</style>
      <div className="w-full max-w-2xl">
        <div className="mb-1 flex items-center justify-between">
          <button onClick={onBack} className="text-sm" style={{ color: "#a89a7d" }}>
            ← Campaigns
          </button>
          <span
            className="rounded px-2 py-1 text-[11px] uppercase tracking-widest"
            style={{ background: role === "DM" ? "#E2A052" : "#2a2622", color: role === "DM" ? "#121110" : "#8a7d63" }}
          >
            {role === "DM" ? "Dungeon Master" : "Player"}
          </span>
        </div>
        <h1 className="mb-6 text-xl tracking-wide" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
          {campaignName}
        </h1>

        {screen.name === "list" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
                Characters
              </span>
              <div className="flex items-center gap-4">
                {role === "DM" && (
                  <button onClick={() => setScreen({ name: "catalog" })} className="text-sm" style={{ color: "#a89a7d" }}>
                    Catalog
                  </button>
                )}
                <button onClick={() => setScreen({ name: "bagOfHolding" })} className="text-sm" style={{ color: "#a89a7d" }}>
                  Bag of Holding
                </button>
                <button onClick={() => setScreen({ name: "create" })} className="text-sm" style={{ color: "#E2A052" }}>
                  + New Character
                </button>
              </div>
            </div>

            {errorMessage && <p className="mb-4 text-sm text-red-400">{errorMessage}</p>}
            {isLoading ? (
              <p className="text-sm" style={{ color: "#8a7d63" }}>Loading characters…</p>
            ) : characters.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "#5f5947" }}>
                No characters yet. Create one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {characters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => setScreen({ name: "sheet", characterId: character.id })}
                    className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left"
                    style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}
                  >
                    <div>
                      <div style={{ color: "#F0C58A" }}>{character.name}</div>
                      <div className="text-[11px]" style={{ color: "#5f5947" }}>{character.race}</div>
                    </div>
                    <span className="text-sm" style={{ color: "#a89a7d" }}>
                      {character.hpCurrent} / {character.hpMax} HP
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {screen.name === "create" && (
          <CreateCharacterScreen
            campaignId={campaignId}
            onCreated={handleCharacterCreated}
            onCancel={() => setScreen({ name: "list" })}
          />
        )}

        {screen.name === "sheet" && (
          <CharacterSheet
            characterId={screen.characterId}
            campaignId={campaignId}
            canEdit={role === "DM" || canEditCharacter(screen.characterId)}
            onBack={() => setScreen({ name: "list" })}
          />
        )}
      </div>
    </div>
  );

  // Tip: a DM can edit any character in their campaign; a player can only
  // edit a character whose owner is themselves. Looked up from the
  // already-loaded character list rather than fetched separately.
  function canEditCharacter(characterId: string): boolean {
    const character = characters.find((c) => c.id === characterId);
    return character?.ownerUserId === currentUserId;
  }
}
