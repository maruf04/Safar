import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './ui';
import { toISODate, formatDate, formatMonth, num } from '../lib/format';
import { useT } from '../i18n';

const WEEKDAYS = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],
};

const parseISO = (iso) => new Date(`${iso}T00:00:00`);
const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};
const monthKey = (iso) => iso.slice(0, 7); // "2026-11"

/*
  Custom calendar popover. The native <input type="date"> popup can't be
  styled, so this replaces it. Keyboard: arrows move by day/week,
  Enter/Space picks, Escape closes.
*/
const DatePicker = ({ id, value, min, max, onChange }) => {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(monthKey(value || min)); // month being shown
  const [focused, setFocused] = useState(value || min);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const [popTop, setPopTop] = useState(null); // px from the field's top
  const dayRefs = useRef({});

  const today = toISODate(new Date());
  const inRange = (iso) => (!min || iso >= min) && (!max || iso <= max);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the calendar on screen: below the field, above it if there is no room below,
  // otherwise as close as the window allows (never under the sticky navbar)
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      if (!popRef.current || !triggerRef.current) return;
      const field = triggerRef.current.getBoundingClientRect();
      const header = document.querySelector('header');
      const h = popRef.current.offsetHeight;
      const min = (header ? Math.max(0, header.getBoundingClientRect().bottom) : 0) + 8;
      const max = window.innerHeight - h - 8;
      const below = field.bottom + 10;
      const above = field.top - 10 - h;
      let top = Math.max(min, Math.min(below, max));
      if (below <= max) top = below;
      else if (above >= min) top = above;
      setPopTop(top - rootRef.current.getBoundingClientRect().top);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  // Move keyboard focus to the focused day, without letting the browser scroll the page
  useEffect(() => {
    if (open && dayRefs.current[focused]) dayRefs.current[focused].focus({ preventScroll: true });
  }, [open, focused, view]);

  const openPicker = () => {
    const start = value || min;
    setView(monthKey(start));
    setFocused(start);
    setOpen(true);
  };

  const pick = (iso) => {
    if (!inRange(iso)) return;
    onChange(iso);
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus({ preventScroll: true });
  };

  const moveFocus = (delta) => {
    const next = addDays(focused, delta);
    if (!inRange(next)) return;
    setFocused(next);
    setView(monthKey(next));
  };

  const onGridKey = (e) => {
    const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (map[e.key] !== undefined) {
      e.preventDefault();
      moveFocus(map[e.key]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      if (triggerRef.current) triggerRef.current.focus({ preventScroll: true });
    }
  };

  // Build the 6-row grid for the visible month
  const cells = useMemo(() => {
    const first = parseISO(`${view}-01`);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toISODate(d);
      return { iso, day: d.getDate(), outside: monthKey(iso) !== view };
    });
  }, [view]);

  const shiftMonth = (n) => {
    const d = parseISO(`${view}-01`);
    d.setMonth(d.getMonth() + n);
    setView(monthKey(toISODate(d)));
  };
  const prevDisabled = min && monthKey(min) >= view;
  const nextDisabled = max && monthKey(max) <= view;
  const monthLabel = formatMonth(parseISO(`${view}-01`));

  const tomorrow = addDays(today, 1);

  return (
    <div className="dp" ref={rootRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="dp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span className="dp-trigger-icon"><Icon name="calendar" size={18} /></span>
        <span className="dp-trigger-text">{value ? formatDate(value) : t('Pick a date')}</span>
      </button>

      {open && (
        <div className="dp-pop" ref={popRef} style={popTop === null ? undefined : { top: popTop }} role="dialog" aria-label={t('Choose journey date')}>
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => shiftMonth(-1)} disabled={prevDisabled} aria-label={t('Previous month')}>
              <Icon name="arrowLeft" size={16} />
            </button>
            <span className="dp-month" aria-live="polite">{monthLabel}</span>
            <button type="button" className="dp-nav" onClick={() => shiftMonth(1)} disabled={nextDisabled} aria-label={t('Next month')}>
              <Icon name="arrowRight" size={16} />
            </button>
          </div>

          <div className="dp-grid" role="grid" onKeyDown={onGridKey}>
            {WEEKDAYS[lang].map((w) => <span key={w} className="dp-wd" aria-hidden="true">{w}</span>)}
            {cells.map((c) => {
              const enabled = inRange(c.iso);
              const selected = c.iso === value;
              const cls = [
                'dp-day',
                c.outside && 'is-outside',
                selected && 'is-selected',
                c.iso === today && 'is-today',
                enabled && !selected && 'is-available',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={c.iso}
                  ref={(el) => { dayRefs.current[c.iso] = el; }}
                  type="button"
                  className={cls}
                  disabled={!enabled}
                  tabIndex={c.iso === focused ? 0 : -1}
                  aria-pressed={selected}
                  aria-label={formatDate(c.iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  onClick={() => pick(c.iso)}
                >
                  {num(c.day)}
                </button>
              );
            })}
          </div>

          <div className="dp-foot">
            <button type="button" className="dp-chip" onClick={() => pick(today)} disabled={!inRange(today)}>{t('Today')}</button>
            <button type="button" className="dp-chip" onClick={() => pick(tomorrow)} disabled={!inRange(tomorrow)}>{t('Tomorrow')}</button>
            <span className="dp-note">{t('Booking opens 10 days ahead')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
