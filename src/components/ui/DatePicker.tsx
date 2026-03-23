import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import './DatePicker.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DatePickerProps {
  value: string;          // ISO string yyyy-mm-dd or empty
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date…',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse the current value
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  // Calendar display state
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());

  // Sync viewMonth/viewYear when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps


  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const buildDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const pm = viewMonth === 0 ? 11 : viewMonth - 1;
      const py = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day: daysInPrevMonth - i, month: pm, year: py, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = viewMonth === 11 ? 0 : viewMonth + 1;
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: d, month: nm, year: ny, isCurrentMonth: false });
    }

    return cells;
  };

  const selectDate = (day: number, month: number, year: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${year}-${m}-${d}`);
    setOpen(false);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleToday = () => {
    onChange(todayStr);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const cells = buildDays();

  return (
    <div className="datepicker" ref={ref}>
      <button
        type="button"
        className={`datepicker-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <Calendar size={14} className="datepicker-icon" />
        <span className={displayValue ? 'datepicker-value' : 'datepicker-placeholder'}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div className="datepicker-dropdown">
          <div className="datepicker-nav">
            <button type="button" className="datepicker-nav-btn" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </button>
            <span className="datepicker-nav-title">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" className="datepicker-nav-btn" onClick={nextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="datepicker-weekdays">
            {DAYS.map((d) => (
              <span key={d} className="datepicker-weekday">{d}</span>
            ))}
          </div>

          <div className="datepicker-grid">
            {cells.map((cell, i) => {
              const cellStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const isSelected = cellStr === value;
              const isToday = cellStr === todayStr;

              return (
                <button
                  key={i}
                  type="button"
                  className={[
                    'datepicker-day',
                    !cell.isCurrentMonth && 'outside',
                    isSelected && 'selected',
                    isToday && !isSelected && 'today',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => selectDate(cell.day, cell.month, cell.year)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="datepicker-footer">
            <button type="button" className="datepicker-footer-btn" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="datepicker-footer-btn primary" onClick={handleToday}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   DATE TIME PICKER
   Calendar + Custom scrollable time pickers
   Enforces minimum 5-minutes-in-the-future
   ═══════════════════════════════════════ */

interface DateTimePickerProps {
  value: string;            // yyyy-mm-ddTHH:MM or empty
  onChange: (value: string) => void;
  placeholder?: string;
  minFutureMinutes?: number; // minimum minutes from now, default 5
}

/* Small scrollable column for hours or minutes */
function TimeColumn({
  items,
  selected,
  onSelect,
  disabledItems,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
  disabledItems?: Set<string>;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view on mount / change
  useEffect(() => {
    if (!listRef.current) return;
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      const el = listRef.current.children[idx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [selected, items]);

  return (
    <div className="dtp-time-col" ref={listRef}>
      {items.map(v => {
        const disabled = disabledItems?.has(v);
        return (
          <button
            key={v}
            type="button"
            className={`dtp-time-item${v === selected ? ' active' : ''}${disabled ? ' disabled' : ''}`}
            disabled={disabled}
            onClick={() => !disabled && onSelect(v)}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date & time…',
  minFutureMinutes = 5,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse value: "2026-03-25T14:30"
  const [datePart, timePart] = (value || '').split('T');
  const parsed = datePart ? new Date(datePart + 'T00:00:00') : null;
  const hour = timePart ? timePart.split(':')[0] : '';
  const minute = timePart ? timePart.split(':')[1] : '';

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
    if (timePart) {
      setSelectedHour(timePart.split(':')[0]);
      setSelectedMinute(timePart.split(':')[1]);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Minimum datetime logic ──
  const now = new Date();
  const minTime = new Date(now.getTime() + minFutureMinutes * 60_000);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // Date string for yesterday (anything before today is disabled)
  const minDateStr = todayStr;

  const isDayDisabled = (cellStr: string) => cellStr < minDateStr;

  // Hours/minutes that are too early on today's date
  const getDisabledHours = (forDate: string): Set<string> => {
    if (forDate !== todayStr) return new Set();
    const cutoffHour = minTime.getHours();
    const cutoffMin = minTime.getMinutes();
    const disabled = new Set<string>();
    for (let h = 0; h < 24; h++) {
      // If every 5-min slot in this hour is before the cutoff, disable it
      const hStr = String(h).padStart(2, '0');
      // An hour is disabled if even :55 of that hour is before cutoff
      const latestInHour = h * 60 + 55;
      const cutoff = cutoffHour * 60 + cutoffMin;
      if (latestInHour < cutoff) disabled.add(hStr);
    }
    return disabled;
  };

  const getDisabledMinutes = (forDate: string, forHour: string): Set<string> => {
    if (forDate !== todayStr) return new Set();
    const h = parseInt(forHour, 10);
    const cutoffHour = minTime.getHours();
    const cutoffMin = minTime.getMinutes();
    const disabled = new Set<string>();
    for (const mStr of MINUTES) {
      const m = parseInt(mStr, 10);
      const totalMins = h * 60 + m;
      const cutoff = cutoffHour * 60 + cutoffMin;
      if (totalMins < cutoff) disabled.add(mStr);
    }
    return disabled;
  };

  const buildDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const pm = viewMonth === 0 ? 11 : viewMonth - 1;
      const py = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day: daysInPrevMonth - i, month: pm, year: py, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = viewMonth === 11 ? 0 : viewMonth + 1;
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: d, month: nm, year: ny, isCurrentMonth: false });
    }
    return cells;
  };

  // Clamp time if the chosen combination would be in the past
  const clampTime = (dateStr: string, h: string, m: string): [string, string] => {
    if (dateStr !== todayStr) return [h, m];
    const cutoffHour = minTime.getHours();
    const cutoffMin = minTime.getMinutes();
    let hNum = parseInt(h, 10);
    let mNum = parseInt(m, 10);
    if (hNum * 60 + mNum < cutoffHour * 60 + cutoffMin) {
      hNum = cutoffHour;
      // Round up to next 5-min slot
      mNum = Math.ceil(cutoffMin / 5) * 5;
      if (mNum >= 60) { mNum = 0; hNum++; }
    }
    return [String(hNum).padStart(2, '0'), String(mNum).padStart(2, '0')];
  };

  const emit = (dateStr: string, h: string, m: string) => {
    const [ch, cm] = clampTime(dateStr, h, m);
    setSelectedHour(ch);
    setSelectedMinute(cm);
    onChange(`${dateStr}T${ch}:${cm}`);
  };

  const selectDate = (day: number, month: number, year: number) => {
    const mo = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${year}-${mo}-${d}`;
    // Auto-pick a reasonable time if no time is selected yet
    const h = selectedHour || String(minTime.getHours()).padStart(2, '0');
    const m = selectedMinute || String(Math.ceil(minTime.getMinutes() / 5) * 5).padStart(2, '0');
    emit(dateStr, h, m);
  };

  const handleClear = () => { onChange(''); setOpen(false); };
  const handleEarliestSlot = () => {
    let mNum = Math.ceil(minTime.getMinutes() / 5) * 5;
    let hNum = minTime.getHours();
    if (mNum >= 60) { mNum = 0; hNum++; }
    const m = String(mNum).padStart(2, '0');
    const hh = String(hNum).padStart(2, '0');
    setSelectedHour(hh);
    setSelectedMinute(m);
    emit(todayStr, hh, m);
    setOpen(false);
  };

  const displayValue = parsed
    ? `${parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${selectedHour.padStart(2, '0')}:${selectedMinute.padStart(2, '0')}`
    : '';

  const cells = buildDays();
  const disabledHours = datePart ? getDisabledHours(datePart) : new Set<string>();
  const disabledMinutes = datePart ? getDisabledMinutes(datePart, selectedHour) : new Set<string>();

  return (
    <div className="datepicker" ref={ref}>
      <button type="button" className={`datepicker-trigger ${open ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        <Calendar size={14} className="datepicker-icon" />
        <span className={displayValue ? 'datepicker-value' : 'datepicker-placeholder'}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div className="datepicker-dropdown dtp-datetime-dropdown">
          <div className="datepicker-nav">
            <button type="button" className="datepicker-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span className="datepicker-nav-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="datepicker-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>

          <div className="datepicker-weekdays">
            {DAYS.map(d => <span key={d} className="datepicker-weekday">{d}</span>)}
          </div>

          <div className="datepicker-grid">
            {cells.map((cell, i) => {
              const cellStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const isSelected = cellStr === datePart;
              const isToday = cellStr === todayStr;
              const disabled = isDayDisabled(cellStr);
              return (
                <button key={i} type="button"
                  disabled={disabled}
                  className={[
                    'datepicker-day',
                    !cell.isCurrentMonth && 'outside',
                    isSelected && 'selected',
                    isToday && !isSelected && 'today',
                    disabled && 'past-disabled',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !disabled && selectDate(cell.day, cell.month, cell.year)}>{cell.day}</button>
              );
            })}
          </div>

          {/* Custom scrollable time pickers */}
          <div className="dtp-time-section">
            <div className="dtp-time-label">
              <Clock size={13} />
              <span>Time</span>
            </div>
            <div className="dtp-time-cols">
              <TimeColumn
                items={HOURS}
                selected={selectedHour}
                disabledItems={disabledHours}
                onSelect={h => { setSelectedHour(h); if (datePart) emit(datePart, h, selectedMinute || '00'); }}
              />
              <div className="dtp-time-sep">:</div>
              <TimeColumn
                items={MINUTES}
                selected={selectedMinute}
                disabledItems={disabledMinutes}
                onSelect={m => { setSelectedMinute(m); if (datePart) emit(datePart, selectedHour || '12', m); }}
              />
            </div>
          </div>

          <div className="datepicker-footer">
            <button type="button" className="datepicker-footer-btn" onClick={handleClear}>Clear</button>
            <button type="button" className="datepicker-footer-btn primary" onClick={handleEarliestSlot}>Earliest</button>
          </div>
        </div>
      )}
    </div>
  );
}
