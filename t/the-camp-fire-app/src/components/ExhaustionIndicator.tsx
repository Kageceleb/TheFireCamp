interface ExhaustionIndicatorProps {
  level: number; // 0-6, but only levels 1-5 render as pips (6 is death, not a segment)
  onChange: (newLevel: number) => void;
  canEdit: boolean;
}

/**
 * Tip: click a pip to set exhaustion to that level; click the currently
 * lit topmost pip again to step back down by one. Hidden entirely at 0
 * per spec — exhaustion only becomes visible once it matters.
 */
export default function ExhaustionIndicator({ level, onChange, canEdit }: ExhaustionIndicatorProps) {
  if (level === 0 && !canEdit) {
    return null;
  }

  function handlePipClick(pipIndex: number) {
    if (!canEdit) return;
    const pipLevel = pipIndex + 1;
    onChange(level === pipLevel ? pipLevel - 1 : pipLevel);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-widest" style={{ color: "#a89a7d" }}>
        Exhaustion
      </span>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((pipIndex) => {
          const isLit = level >= pipIndex + 1;
          return (
            <button
              key={pipIndex}
              disabled={!canEdit}
              onClick={() => handlePipClick(pipIndex)}
              className="h-3 w-3 rounded-full"
              style={{
                background: isLit ? "#E2A052" : "#2a2622",
                border: "1px solid #3D2B1D",
                cursor: canEdit ? "pointer" : "default",
              }}
              aria-label={`Exhaustion level ${pipIndex + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
