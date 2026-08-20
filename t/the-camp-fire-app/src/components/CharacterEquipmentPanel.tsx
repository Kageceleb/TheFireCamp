import { unequipItem, type EquippedItem } from "../lib/supabase/equipment";

interface CharacterEquipmentPanelProps {
  equippedItems: EquippedItem[];
  characterId: string;
  canEdit: boolean;
  onChanged: () => void;
}

/**
 * Tip: shows what's currently worn/wielded, slot by slot, with an
 * unequip action. The Torso and OffHand items here are what actually
 * feed AC (see CharacterSheet's calculateArmorClass call) — everything
 * else equipped just displays for now, with no mechanical effect yet.
 */
export default function CharacterEquipmentPanel({ equippedItems, characterId, canEdit, onChanged }: CharacterEquipmentPanelProps) {
  async function handleUnequip(characterItemId: string) {
    try {
      await unequipItem(characterId, characterItemId);
      onChanged();
    } catch (error) {
      alert((error as Error).message);
    }
  }

  if (equippedItems.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#5f5947" }}>
        Nothing equipped yet — equip an item from a bag pocket below.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {equippedItems.map((item) => (
        <div key={item.characterItemId} className="flex items-center justify-between text-sm">
          <span style={{ color: "#F0C58A" }}>
            {item.name} <span className="text-[11px]" style={{ color: "#5f5947" }}>({item.equippedSlot})</span>
          </span>
          {canEdit && (
            <button onClick={() => handleUnequip(item.characterItemId)} className="text-xs" style={{ color: "#d9694f" }}>
              Unequip
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
