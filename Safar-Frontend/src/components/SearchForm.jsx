import React, { useEffect, useMemo, useState } from 'react';
import { API_URL } from './utils';
import { Icon, Alert } from './ui';
import DatePicker from './DatePicker';
import { useT } from '../i18n';
import { toISODate, stationName } from '../lib/format';

const BOOKING_WINDOW_DAYS = 9; // same limit the old date picker used

// Loads station names once (cached in localStorage like before)
export const useStations = () => {
  const [stations, setStations] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('stationNames') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/booking/getStations`);
        if (!res.ok) throw new Error('Failed to fetch stations');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.stationNames)) {
          setStations(data.stationNames);
          localStorage.setItem('stationNames', JSON.stringify(data.stationNames));
        }
      } catch (e) {
        if (!cancelled && stations.length === 0) setError('Could not load stations. Is the server running?'); // translated at render
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stations, error };
};

const SearchForm = ({ initial = {}, onSubmit, submitLabel = 'Search trains' }) => {
  const { t } = useT();
  const { stations, error: stationsError } = useStations();
  const [from, setFrom] = useState(stationName(initial.from));
  const [to, setTo] = useState(stationName(initial.to));
  const [date, setDate] = useState(initial.date || toISODate(new Date()));
  const [error, setError] = useState('');

  // Keep the form in sync when the URL changes (e.g. back button)
  useEffect(() => {
    if (initial.from !== undefined) setFrom(stationName(initial.from));
    if (initial.to !== undefined) setTo(stationName(initial.to));
    if (initial.date) setDate(initial.date);
  }, [initial.from, initial.to, initial.date]);

  const minDate = toISODate(new Date());
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + BOOKING_WINDOW_DAYS);
    return toISODate(d);
  }, []);

  // Match what the user typed against the DB names, ignoring case and underscores
  const norm = (v) => stationName(v).trim().toLowerCase();
  const matchStation = (value) => stations.find((s) => norm(s) === norm(value));

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = matchStation(from);
    const t = matchStation(to);
    if (!from.trim() || !to.trim() || !date) {
      setError(t('Please choose where you’re leaving from, where you’re going and a date.'));
      return;
    }
    if (stations.length && (!f || !t)) {
      setError(t('Please pick stations from the suggestions list.'));
      return;
    }
    if ((f || from) === (t || to)) {
      setError(t('From and To can’t be the same station.'));
      return;
    }
    if (date < minDate || date > maxDate) {
      setError(t('Tickets can be booked from today up to {n} days ahead.', { n: BOOKING_WINDOW_DAYS }));
      return;
    }
    setError('');
    onSubmit({ from: f || from.trim(), to: t || to.trim(), date });
  };

  const swap = () => { setFrom(to); setTo(from); };

  return (
    <form onSubmit={handleSubmit} noValidate className="stack-sm">
      <div className="searchbar" role="search" aria-label={t('Search trains')}>
        <div className="sb-field sb-field-swap">
          <label htmlFor="sb-from">{t('From')}</label>
          <input
            id="sb-from"
            className="sb-input"
            list="station-list"
            placeholder={t('Leaving from')}
            autoComplete="off"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <button type="button" className="sb-swap" onClick={swap} aria-label={t('Swap From and To stations')}>
            <Icon name="swap" size={18} />
          </button>
        </div>
        <div className="sb-field sb-field-to">
          <label htmlFor="sb-to">{t('To')}</label>
          <input
            id="sb-to"
            className="sb-input"
            list="station-list"
            placeholder={t('Going to')}
            autoComplete="off"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="sb-field">
          <label htmlFor="sb-date">{t('Journey date')}</label>
          <DatePicker id="sb-date" value={date} min={minDate} max={maxDate} onChange={setDate} />
        </div>
        <button type="submit" className="btn btn-lg sb-submit">
          <Icon name="search" size={18} /> {t(submitLabel)}
        </button>
      </div>
      <datalist id="station-list">
        {stations.map((s) => <option key={s} value={stationName(s)} />)}
      </datalist>
      {(error || stationsError) && <Alert tone="danger">{error || t(stationsError)}</Alert>}
    </form>
  );
};

export default SearchForm;
