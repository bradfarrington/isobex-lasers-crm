import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
  const buildDays = useCallback(() => {
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
  }, [viewYear, viewMonth]);

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
