import { useEffect, useState } from "react";
import Modal from "../Modal";
import { listCharactersForCampaign, type CharacterListItem } from "../../lib/supabase/characters";

interface GiveItemModalProps {
  campaignId: string;
  excludeCharacterId: string;
  itemName: string;
  isDM: boolean;
  onClose: () => void;
  onGive: (toCharacterId: string) => Promise<void>;
}

/**
 * Tip: picks a recipient for the Give action. The actual mechanics
 * differ by role — a DM's give is immediate (giveItemDirectly), a
 * player's is an async request that needs the recipient to accept
 * (createTransferRequest) — but this modal doesn't know or care which;
 * it just collects "who" and hands that back to the caller via onGive.
 * The one thing it DOES do differently by role is the reassurance text,
 * since a player should know they're not handing the item over
 * immediately.
 */
export default function GiveItemModal({ campaignId, excludeCharacterId, itemName, isDM, onClose, onGive }: GiveItemModalProps) {
  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listCharactersForCampaign(campaignId).then((rows) => {
      setCharacters(rows.filter((character) => character.id !== excludeCharacterId));
      setIsLoading(false);
    });
  }, []);

  async function handleGive(toCharacterId: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onGive(toCharacterId);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={`Give ${itemName}`} onClose={onClose}>
      {!isDM && (
        <p className="mb-3 text-xs" style={{ color: "#8a7d63" }}>
          This sends a request — the item only moves once they accept it.
        </p>
      )}
      {isLoading ? (
        <p className="text-sm" style={{ color: "#8a7d63" }}>
          Loading…
        </p>
      ) : characters.length === 0 ? (
        <p className="text-sm" style={{ color: "#5f5947" }}>
          No other characters in this campaign yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => handleGive(character.id)}
              disabled={isSubmitting}
              className="block w-full rounded px-3 py-2 text-left text-sm disabled:opacity-60"
              style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
            >
              {character.name}
            </button>
          ))}
        </div>
      )}
      {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
    </Modal>
  );
}
