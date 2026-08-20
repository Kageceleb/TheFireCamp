import { useEffect, useState } from "react";
import {
  listPendingTransfersForCharacter,
  acceptTransferRequest,
  declineTransferRequest,
  type PendingTransfer,
} from "../../lib/supabase/itemTransfers";

interface PendingTransfersPanelProps {
  characterId: string;
  canEdit: boolean;
  refreshKey: number;
  onResolved: () => void;
}

/**
 * Tip: the recipient's side of the async Give flow — incoming requests
 * for THIS character, with Accept/Decline. Kept as its own component
 * rather than folded into CharacterBagsPanel since it's a genuinely
 * separate concern (an inbox, not bag/pocket rendering) that happens to
 * live on the same screen. Rendered near the top of the Bags section so
 * it's not missed, not buried under every bag's contents.
 */
export default function PendingTransfersPanel({ characterId, canEdit, refreshKey, onResolved }: PendingTransfersPanelProps) {
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [characterId, refreshKey]);

  async function refresh() {
    try {
      setTransfers(await listPendingTransfersForCharacter(characterId));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleAccept(transfer: PendingTransfer) {
    setBusyId(transfer.id);
    setErrorMessage(null);
    try {
      await acceptTransferRequest(
        transfer.id,
        transfer.fromCharacterId,
        characterId,
        transfer.catalogItemId,
        transfer.quantity,
        transfer.itemGridWidth,
        transfer.itemGridHeight
      );
      await refresh();
      onResolved();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(transfer: PendingTransfer) {
    setBusyId(transfer.id);
    setErrorMessage(null);
    try {
      await declineTransferRequest(transfer.id);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (!canEdit || transfers.length === 0) return null;

  return (
    <div className="rounded-lg p-3" style={{ background: "#2a2119", border: "1px solid #E2A052" }}>
      <div className="mb-2 text-[11px] uppercase tracking-widest" style={{ color: "#E2A052" }}>
        Pending Transfers
      </div>
      {errorMessage && <p className="mb-2 text-sm text-red-400">{errorMessage}</p>}
      <div className="space-y-2">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="flex items-center justify-between text-sm">
            <span style={{ color: "#F0C58A" }}>
              {transfer.itemName}
              {transfer.quantity > 1 ? ` × ${transfer.quantity}` : ""}{" "}
              <span className="text-[11px]" style={{ color: "#8a7d63" }}>from {transfer.fromCharacterName}</span>
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => handleAccept(transfer)}
                disabled={busyId === transfer.id}
                className="text-xs disabled:opacity-60"
                style={{ color: "#4a7c74" }}
              >
                Accept
              </button>
              <button
                onClick={() => handleDecline(transfer)}
                disabled={busyId === transfer.id}
                className="text-xs disabled:opacity-60"
                style={{ color: "#d9694f" }}
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
