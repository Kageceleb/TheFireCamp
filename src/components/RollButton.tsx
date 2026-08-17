import type { ReactNode, CSSProperties } from "react";
import { rollDice, sendChatMessage } from "../lib/symbiote/client";

interface RollButtonProps {
  formula: string;
  label: string;
  characterName: string;
  onRolled: (label: string, total: number) => void;
  /**
   * Optional custom button content — defaults to the 🎲 emoji every
   * other roll button on the sheet still uses. Lets a caller turn the
   * ability modifier itself, or a shield icon, into the clickable roll
   * trigger without duplicating the roll/report/narrate logic here.
   */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * Tip: one button, one roll. Builds the formula into a real TaleSpire
 * dice-tray roll (or a simulated one outside TaleSpire — see
 * src/lib/symbiote/client.ts), reports the total back to the sheet via
 * onRolled, and narrates the result into TaleSpire's chat so the whole
 * table sees it, not just the roller. What the button actually LOOKS
 * like (a die, a number, a shield) is entirely up to the caller via
 * children/className/style — this component only owns the roll itself.
 */
export default function RollButton({
  formula,
  label,
  characterName,
  onRolled,
  children,
  className,
  style,
  title,
}: RollButtonProps) {
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
      title={title ?? `Roll ${formula}`}
      className={className ?? "leading-none"}
      style={style ?? { color: "#E2A052" }}
    >
      {children ?? <D20Icon />}
    </button>
  );
}

/**
 * Tip: the default roll icon everywhere a button doesn't supply its own
 * content (Initiative, Skills) — a proper icosahedron is hard to read
 * at button size, so a hexagon with a few internal facet lines is the
 * standard shorthand UI icon sets use for "d20" without it turning into
 * a blob at 15px.
 */
function D20Icon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <polygon
        points="8,0.5 14.5,4.5 14.5,11.5 8,15.5 1.5,11.5 1.5,4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M8,0.5 L8,15.5 M1.5,4.5 L14.5,11.5 M14.5,4.5 L1.5,11.5"
        stroke="currentColor"
        strokeWidth="0.75"
      />
    </svg>
  );
}
