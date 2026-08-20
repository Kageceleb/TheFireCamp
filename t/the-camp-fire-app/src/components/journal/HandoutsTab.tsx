import { useEffect, useState } from "react";
import {
  listHandouts,
  createHandout,
  revealHandout,
  hideHandout,
  deleteHandout,
  type Handout,
} from "../../lib/supabase/handouts";
import { Field, TextInput, TextAreaInput, SubmitButton } from "../FormControls";

interface HandoutsTabProps {
  campaignId: string;
  role: "DM" | "PLAYER";
}

/**
 * Tip: per spec Module 6, minus the live-push half of "Broadcast to
 * Party" — see the comment on revealHandout in handouts.ts for why.
 * Revealing something here just means it shows up next time a player
 * opens or refreshes this tab, not an instant popup on their screen.
 */
export default function HandoutsTab({ campaignId, role }: HandoutsTabProps) {
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [lightboxHandout, setLightboxHandout] = useState<Handout | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setIsLoading(true);
    try {
      setHandouts(await listHandouts(campaignId));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleReveal(handout: Handout) {
    try {
      if (handout.isRevealed) {
        await hideHandout(handout.id);
      } else {
        await revealHandout(handout.id);
      }
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHandout(id);
      await refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  const visibleHandouts = role === "DM" ? handouts : handouts.filter((handout) => handout.isRevealed);

  return (
    <div className="space-y-4">
      {role === "DM" && (
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded px-3 py-1.5 text-sm"
          style={{ background: "#2a2622", color: "#F0C58A", border: "1px solid #3D2B1D" }}
        >
          + Add Handout
        </button>
      )}

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      {isLoading ? (
        <p className="text-sm" style={{ color: "#8a7d63" }}>
          Loading…
        </p>
      ) : visibleHandouts.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "#5f5947" }}>
          {role === "DM" ? "No handouts yet." : "Nothing's been revealed to the party yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleHandouts.map((handout) => (
            <div key={handout.id} className="rounded-lg p-2" style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}>
              <button onClick={() => setLightboxHandout(handout)} className="block w-full">
                <img
                  src={handout.imageUrl}
                  alt={handout.title}
                  className="aspect-square w-full rounded object-cover"
                  style={{ background: "#121110" }}
                />
              </button>
              <div className="mt-1.5 truncate text-sm" style={{ color: "#F0C58A" }}>
                {handout.title}
              </div>
              {role === "DM" && (
                <div className="mt-1 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleReveal(handout)}
                    className="text-[11px]"
                    style={{ color: handout.isRevealed ? "#4a7c74" : "#a89a7d" }}
                  >
                    {handout.isRevealed ? "Revealed" : "Reveal"}
                  </button>
                  <button onClick={() => handleDelete(handout.id)} className="text-[11px]" style={{ color: "#d9694f" }}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <AddHandoutModal
          onClose={() => setShowAddForm(false)}
          onAdd={async (input) => {
            await createHandout({ campaignId, ...input });
            setShowAddForm(false);
            await refresh();
          }}
        />
      )}

      {lightboxHandout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxHandout(null)}
        >
          <div className="max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <img src={lightboxHandout.imageUrl} alt={lightboxHandout.title} className="max-h-[75vh] w-full rounded object-contain" />
            <div className="mt-3 text-center">
              <div className="text-lg" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
                {lightboxHandout.title}
              </div>
              {lightboxHandout.description && (
                <p className="mt-1 text-sm" style={{ color: "#a89a7d" }}>
                  {lightboxHandout.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddHandoutModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (input: { title: string; description: string; imageUrl: string; category: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !imageUrl.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onAdd({ title: title.trim(), description: description.trim(), imageUrl: imageUrl.trim(), category: category.trim() });
    } catch (error) {
      setErrorMessage((error as Error).message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg p-5"
        style={{ background: "#1e1c19", border: "1px solid #3D2B1D" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-4 tracking-wide" style={{ fontFamily: "Cinzel, serif", color: "#F0C58A" }}>
          Add Handout
        </h3>
        <div className="space-y-3">
          <Field label="Title">
            <TextInput value={title} onChange={setTitle} />
          </Field>
          <Field label="Image URL">
            <TextInput value={imageUrl} onChange={setImageUrl} placeholder="https://..." />
          </Field>
          <Field label="Description (optional)">
            <TextAreaInput value={description} onChange={setDescription} rows={3} />
          </Field>
          <Field label="Category (optional)">
            <TextInput value={category} onChange={setCategory} placeholder="e.g. map, portrait, letter" />
          </Field>
        </div>
        {errorMessage && <p className="mt-2 text-sm text-red-400">{errorMessage}</p>}
        <SubmitButton label={isSubmitting ? "Adding…" : "Add Handout"} onClick={handleSubmit} disabled={isSubmitting} />
      </div>
    </div>
  );
}
