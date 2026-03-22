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
   Calendar + Hour/Minute selectors
   ═══════════════════════════════════════ */

interface DateTimePickerProps {
  value: string;            // yyyy-mm-ddTHH:MM or empty
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date & time…',
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse value: "2026-03-25T14:30"
  const [datePart, timePart] = (value || '').split('T');
  const parsed = datePart ? new Date(datePart + 'T00:00:00') : null;
  const hour = timePart ? timePart.split(':')[0] : '12';
  const minute = timePart ? timePart.split(':')[1] : '00';

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

  const emit = (dateStr: string, h: string, m: string) => {
    onChange(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}`);
  };

  const selectDate = (day: number, month: number, year: number) => {
    const mo = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    emit(`${year}-${mo}-${d}`, selectedHour, selectedMinute);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleClear = () => { onChange(''); setOpen(false); };
  const handleNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setSelectedHour(h);
    setSelectedMinute(m);
    emit(todayStr, h, m);
    setOpen(false);
  };

  const displayValue = parsed
    ? `${parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${selectedHour.padStart(2, '0')}:${selectedMinute.padStart(2, '0')}`
    : '';

  const cells = buildDays();

  return (
    <div className="datepicker" ref={ref}>
      <button type="button" className={`datepicker-trigger ${open ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        <Calendar size={14} className="datepicker-icon" />
        <span className={displayValue ? 'datepicker-value' : 'datepicker-placeholder'}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div className="datepicker-dropdown" style={{ width: 280 }}>
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
              return (
                <button key={i} type="button"
                  className={['datepicker-day', !cell.isCurrentMonth && 'outside', isSelected && 'selected', isToday && !isSelected && 'today'].filter(Boolean).join(' ')}
                  onClick={() => selectDate(cell.day, cell.month, cell.year)}>{cell.day}</button>
              );
            })}
          </div>

          {/* Time selector */}
          <div className="datepicker-time">
            <Clock size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
            <select className="datepicker-time-select" value={selectedHour} onChange={e => { setSelectedHour(e.target.value); if (datePart) emit(datePart, e.target.value, selectedMinute); }}>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <span style={{ fontWeight: 700, opacity: 0.4 }}>:</span>
            <select className="datepicker-time-select" value={selectedMinute} onChange={e => { setSelectedMinute(e.target.value); if (datePart) emit(datePart, selectedHour, e.target.value); }}>
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="datepicker-footer">
            <button type="button" className="datepicker-footer-btn" onClick={handleClear}>Clear</button>
            <button type="button" className="datepicker-footer-btn primary" onClick={handleNow}>Now</button>
          </div>
        </div>
      )}
    </div>
  );
}
