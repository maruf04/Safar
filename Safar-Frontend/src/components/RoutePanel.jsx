import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_URL } from './utils';
import RouteMap from './RouteMap';
import { formatTime, num, stationName } from '../lib/format';
import { useT } from '../i18n';

const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

/** Stops of one direction in travel order: [{ name, arrival, departure }] */
export const stopsOf = (leg) => {
  const rows = leg?.timetable || [];
  if (!rows.length) return [];
  const stops = rows.map((r) => ({ name: r.from_station, arrival: r.arrival_time, departure: r.departure_time }));
  stops.push({ name: rows[rows.length - 1].to_station, arrival: null, departure: null });
  return stops;
};

/** Loads /booking/trainDetails for a train name. Returns { data, loading, error } */
export const useTrainDetails = (trainName) => {
  const { t } = useT();
  const navigate = useNavigate();
  const [state, setState] = useState({ data: null, loading: false, error: '' });

  useEffect(() => {
    if (!trainName) {
      setState({ data: null, loading: false, error: '' });
      return undefined;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: '' });
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/booking/trainDetails`, {
          method: 'POST',
          body: JSON.stringify({ train_name: trainName }),
        }, navigate);
        const data = await res.json();
        if (!res.ok || !data || data.success === false || (!data.UP && !data.DOWN)) {
          throw new Error(data?.error || t('Train not found'));
        }
        if (!cancelled) setState({ data, loading: false, error: '' });
      } catch (err) {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainName]);

  return state;
};

export const Timetable = ({ leg, highlight }) => {
  const { t } = useT();
  const rows = leg.timetable || [];
  const last = rows[rows.length - 1];
  const stops = stopsOf(leg);
  const fromIdx = highlight ? stops.findIndex((s) => same(s.name, highlight.from)) : -1;
  const toIdx = highlight ? stops.findIndex((s) => same(s.name, highlight.to)) : -1;
  const hasTrip = fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;
  const cls = (idx) => {
    if (!hasTrip) return 'tl-item';
    if (idx === fromIdx || idx === toIdx) return 'tl-item tl-trip tl-trip-end';
    if (idx > fromIdx && idx < toIdx) return 'tl-item tl-trip';
    return 'tl-item tl-off';
  };

  return (
    <ol className="timeline">
      {rows.map((row, idx) => (
        <li key={idx} className={cls(idx)}>
          <span className="tl-time">{formatTime(row.departure_time || row.arrival_time)}</span>
          <span className="tl-rail" aria-hidden="true"><span className="tl-dot" /><span className="tl-line" /></span>
          <div className="tl-body">
            <div className="tl-station">
              {stationName(row.from_station)}
              {hasTrip && idx === fromIdx && <span className="badge" style={{ marginLeft: 8 }}>{t('You board')}</span>}
            </div>
            <div className="tl-meta">
              {idx === 0 ? t('Departs') : t('Arrives {arr} · departs {dep}', { arr: formatTime(row.arrival_time), dep: formatTime(row.departure_time) })}
              {row.duration && <> · {t('{duration} to {station}', { duration: num(row.duration), station: stationName(row.to_station) })}</>}
            </div>
          </div>
        </li>
      ))}
      {last && (
        <li className={cls(rows.length)}>
          <span className="tl-time" />
          <span className="tl-rail" aria-hidden="true"><span className="tl-dot" /><span className="tl-line" /></span>
          <div className="tl-body">
            <div className="tl-station">
              {stationName(last.to_station)}
              {hasTrip && toIdx === rows.length && <span className="badge" style={{ marginLeft: 8 }}>{t('You get off')}</span>}
            </div>
            <div className="tl-meta">{t('Final stop')}</div>
          </div>
        </li>
      )}
    </ol>
  );
};

/** Pick the direction in which `from` comes before `to` */
const directionFor = (data, highlight) => {
  const legs = ['UP', 'DOWN'].filter((d) => data?.[d]);
  if (highlight) {
    const match = legs.find((d) => {
      const stops = stopsOf(data[d]);
      const a = stops.findIndex((s) => same(s.name, highlight.from));
      const b = stops.findIndex((s) => same(s.name, highlight.to));
      return a !== -1 && b !== -1 && a < b;
    });
    if (match) return match;
  }
  return legs[0] || 'UP';
};

/**
 * Direction tabs + real route map + stop-by-stop timetable for one train.
 * Used on the Timetable page and in the "Route & stops" popup on search results.
 */
const RoutePanel = ({ data, highlight, mapHeight = 420 }) => {
  const { t } = useT();
  const legs = ['UP', 'DOWN'].filter((d) => data?.[d]);
  const [direction, setDirection] = useState(() => directionFor(data, highlight));

  useEffect(() => { setDirection(directionFor(data, highlight)); }, [data, highlight]);

  const leg = data?.[direction];
  const stops = useMemo(() => stopsOf(leg), [leg]);

  if (!leg) return null;

  return (
    <div className="stack">
      {legs.length > 1 && (
        <div className="tabs" role="tablist" aria-label={t('Direction')}>
          {legs.map((d) => (
            <button key={d} type="button" role="tab" className="tab" aria-selected={direction === d} onClick={() => setDirection(d)}>
              {data[d].route_name || (d === 'UP' ? t('Up train') : t('Down train'))}
            </button>
          ))}
        </div>
      )}
      <div className="route-split">
        <RouteMap stops={stops} highlight={highlight} height={mapHeight} />
        <div className="route-split-list" style={{ maxHeight: mapHeight }}>
          <Timetable leg={leg} highlight={highlight} />
        </div>
      </div>
    </div>
  );
};

export default RoutePanel;
