interface DeathSavesIndicatorProps {
  successes: number;
  failures: number;
  onChangeSuccesses: (value: number) => void;
  onChangeFailures: (value: number) => void;
  canEdit: boolean;
}

/** Tip: only render this when hp_current <= 0 — the caller decides that, this component just draws whatever counts it's given. */
export default function DeathSavesIndicator({
  successes,
  failures,
  onChangeSuccesses,
  onChangeFailures,
  canEdit,
}: DeathSavesIndicatorProps) {
  return (
    <div className="flex items-center gap-4">
      <PipRow label="Successes" count={successes} color="#5C7A5E" onChange={onChangeSuccesses} canEdit={canEdit} />
      <PipRow label="Failures" count={failures} color="#B3492F" onChange={onChangeFailures} canEdit={canEdit} />
    </div>
  );
}

interface PipRowProps {
  label: string;
  count: number;
  color: string;
  onChange: (value: number) => void;
  canEdit: boolean;
}

function PipRow({ label, count, color, onChange, canEdit }: PipRowProps) {
  function handlePipClick(pipIndex: number) {
    if (!canEdit) return;
    const pipValue = pipIndex + 1;
    onChange(count === pipValue ? pipValue - 1 : pipValue);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        {label}
      </span>
      <div className="flex gap-1">
        {[0, 1, 2].map((pipIndex) => (
          <button
            key={pipIndex}
            disabled={!canEdit}
            onClick={() => handlePipClick(pipIndex)}
            className="h-3 w-3 rounded-full"
            style={{
              background: count >= pipIndex + 1 ? color : "#2a2622",
              border: "1px solid #3D2B1D",
              cursor: canEdit ? "pointer" : "default",
            }}
            aria-label={`${label} ${pipIndex + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
