import { useState } from "react";
import { PALETTES } from "../app/hooks/useTweaks.js";

function Segmented({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? "is-on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Live in-page tweaks: accent palette, display font family, layout density.
export default function TweaksPanel({ tweaks, setTweak }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="tweaks">
      {open && (
        <div className="tweaks__panel">
          <div className="tweaks__hd">
            <span>Tweaks · Kora</span>
            <button type="button" aria-label="Close tweaks" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="tweaks-section">
            <div className="tweaks-section__lbl">Accent palette</div>
            <div className="swatches">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={"swatch" + (tweaks.palette === p.id ? " is-active" : "")}
                  onClick={() => setTweak("palette", p.id)}
                  style={{ "--c": p.dark.accent, "--c2": p.dark.accent2 }}
                >
                  <div className="swatch__dots">
                    <span className="swatch__dot" />
                    <span className="swatch__dot swatch__dot--2" />
                  </div>
                  <div className="swatch__name">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="tweaks-section">
            <div className="tweaks-section__lbl">Display type</div>
            <Segmented
              value={tweaks.displayFont}
              onChange={(v) => setTweak("displayFont", v)}
              options={[
                { value: "serif", label: "Serif" },
                { value: "grotesque", label: "Grot" },
                { value: "mono", label: "Mono" },
              ]}
            />
          </div>

          <div className="tweaks-section">
            <div className="tweaks-section__lbl">Density</div>
            <Segmented
              value={tweaks.density}
              onChange={(v) => setTweak("density", v)}
              options={[
                { value: "compact", label: "Compact" },
                { value: "normal", label: "Normal" },
                { value: "spacious", label: "Spacious" },
              ]}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="tweaks__toggle"
        aria-label="Tweaks"
        title="Tweaks"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕" : "⚙"}
      </button>
    </div>
  );
}
