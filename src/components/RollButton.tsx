import { rollDice, sendChatMessage } from "../lib/symbiote/client";

interface RollButtonProps {
  formula: string;
  label: string;
  characterName: string;
  onRolled: (label: string, total: number) => void;
}

/**
 * Tip: one button, one roll. Builds the formula into a real TaleSpire
 * dice-tray roll (or a simulated one outside TaleSpire — see
 * src/lib/symbiote/client.ts), reports the total back to the sheet via
 * onRolled, and narrates the result into TaleSpire's chat so the whole
 * table sees it, not just the roller.
 */
export default function RollButton({ formula, label, characterName, onRolled }: RollButtonProps) {
  async function handleClick() {
    try {
      const total = await rollDice(formula, label);
      onRolled(label, total);
      void sendChatMessage(`${characterName} rolled ${label}: ${total} (${formula})`);
    } catch (error) {
      console.error(error);
      onRolled(label, NaN);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Roll ${formula}`}
      className="leading-none"
      style={{ color: "#E2A052" }}
    >
      🎲
    </button>
  );
}
