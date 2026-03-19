import { useState, useRef, useCallback, useEffect } from 'react';
import './ColorPicker.css';

/* ── Preset palette ── */
const PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6',
  '#6366f1', '#a855f7', '#ec4899', '#6b7280', '#1e293b', '#0ea5e9',
];

/* ── Color math helpers ── */
function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const val = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(val * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

/* ── Component ── */
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // HSV state derived from the value prop
  const [hue, setHue] = useState(() => hexToHsv(value)[0]);
  const [sat, setSat] = useState(() => hexToHsv(value)[1]);
  const [val, setVal] = useState(() => hexToHsv(value)[2]);

  // Semi-controlled hex input buffer
  const display = hsvToHex(hue, sat, val);
  const [hexInput, setHexInput] = useState(display);

  // Sync hex input when display changes (from canvas/slider interaction)
  useEffect(() => {
    setHexInput(display);
  }, [display]);

  // Sync HSV when value prop changes externally
  useEffect(() => {
    const [h, s, v] = hexToHsv(value);
    setHue(h);
    setSat(s);
    setVal(v);
  }, [value]);

  // Popover positioning
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const openPicker = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popoverHeight = 340;
    const top = spaceBelow > popoverHeight + 8
      ? rect.bottom + 6
      : rect.top - popoverHeight - 6;
    const left = Math.min(rect.left, window.innerWidth - 256);
    setPos({ top, left });
    setOpen(true);
  }, []);

  /* ── SV Canvas interactions ── */
  const svRef = useRef<HTMLCanvasElement>(null);

  const drawSvCanvas = useCallback(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Base hue
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, w, h);

    // White gradient left→right (saturation)
    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);

    // Black gradient top→bottom (value)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
  }, [hue]);

  useEffect(() => {
    if (open) drawSvCanvas();
  }, [open, drawSvCanvas]);

  const updateSVFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = svRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
      const newSat = x / rect.width;
      const newVal = 1 - y / rect.height;
      setSat(newSat);
      setVal(newVal);
      onChange(hsvToHex(hue, newSat, newVal));
    },
    [hue, onChange],
  );

  const handleSvDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateSVFromPointer(e.clientX, e.clientY);
    },
    [updateSVFromPointer],
  );

  const handleSvMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons === 0) return;
      updateSVFromPointer(e.clientX, e.clientY);
    },
    [updateSVFromPointer],
  );

  /* ── Hue slider interactions ── */
  const hueRef = useRef<HTMLDivElement>(null);

  const updateHueFromPointer = useCallback(
    (clientX: number) => {
      const track = hueRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const newHue = (x / rect.width) * 360;
      setHue(newHue);
      onChange(hsvToHex(newHue, sat, val));
    },
    [sat, val, onChange],
  );

  const handleHueDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateHueFromPointer(e.clientX);
    },
    [updateHueFromPointer],
  );

  const handleHueMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons === 0) return;
      updateHueFromPointer(e.clientX);
    },
    [updateHueFromPointer],
  );

  /* ── Hex input ── */
  const handleHexChange = (v: string) => {
    let input = v;
    if (!input.startsWith('#')) input = '#' + input;
    setHexInput(input);
    if (/^#[0-9a-fA-F]{6}$/.test(input)) {
      const [h, s, vl] = hexToHsv(input);
      setHue(h);
      setSat(s);
      setVal(vl);
      onChange(input.toLowerCase());
    }
  };

  /* ── Preset click ── */
  const selectPreset = (color: string) => {
    const [h, s, v] = hexToHsv(color);
    setHue(h);
    setSat(s);
    setVal(v);
    onChange(color);
    setOpen(false);
  };

  return (
    <div className="color-picker-wrapper">
      <button
        ref={triggerRef}
        className="color-picker-trigger"
        style={{ backgroundColor: value }}
        onClick={openPicker}
        type="button"
        aria-label="Pick a color"
      />

      {open && (
        <>
          <div
            className="color-picker-backdrop"
            onClick={() => setOpen(false)}
          />
          <div
            ref={popoverRef}
            className="color-picker-popover"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* Preset swatches */}
            <div className="color-picker-presets">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  className={`color-picker-preset${value.toLowerCase() === c ? ' active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => selectPreset(c)}
                  type="button"
                  aria-label={c}
                />
              ))}
            </div>

            <hr className="color-picker-divider" />

            {/* SV Canvas */}
            <div style={{ position: 'relative' }}>
              <canvas
                ref={svRef}
                className="color-picker-sv-canvas"
                width={240}
                height={140}
                onPointerDown={handleSvDown}
                onPointerMove={handleSvMove}
              />
              <div
                className="color-picker-sv-handle"
                style={{
                  left: `${sat * 100}%`,
                  top: `${(1 - val) * 100}%`,
                  backgroundColor: display,
                }}
              />
            </div>

            {/* Hue slider */}
            <div
              ref={hueRef}
              className="color-picker-hue-track"
              onPointerDown={handleHueDown}
              onPointerMove={handleHueMove}
            >
              <div
                className="color-picker-hue-thumb"
                style={{
                  left: `${(hue / 360) * 100}%`,
                  backgroundColor: `hsl(${hue}, 100%, 50%)`,
                }}
              />
            </div>

            {/* Hex input */}
            <div className="color-picker-hex-row">
              <div
                className="color-picker-hex-preview"
                style={{ backgroundColor: display }}
              />
              <input
                className="color-picker-hex-input"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                maxLength={7}
                spellCheck={false}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
