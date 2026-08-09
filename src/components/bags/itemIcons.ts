import { Sword, Shield, FlaskConical, Coins, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  weapon: Sword,
  armor: Shield,
  flask: FlaskConical,
  currency: Coins,
};

/** Tip: falls back to a generic pack icon for any category without a specific one — a new homebrew item category never renders broken, it just looks generic until someone adds a mapping for it. */
export function iconForCategory(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Package;
}
