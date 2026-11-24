import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './ui';
import RouteMap from './RouteMap';
import { useNetwork, useRoutes, dhakaNow, runsOn, toMinutes, trainsBetween } from '../lib/network';
import { formatDuration, formatTime, num, stationName, toISODate, durationMinutes, trainLabel } from '../lib/format';
import { useT } from '../i18n';

const searchLink = (from, to) =>
  `/booking/train/search?${new URLSearchParams({ from, to, date: toISODate(new Date()) }).toString()}`;

const SectionHead = ({ eyebrow, title, id, children }) => (
  <div className="row-between" style={{ alignItems: 'flex-end' }}>
    <div className="stack-sm">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="h2">{title}</h2>
    </div>
    {children}
  </div>
);

/* ---------- Popular routes ---------- */
const POPULAR = [
  ['Dhaka', 'Chattogram'], ['Dhaka', 'Sylhet'], ['Dhaka', "Cox's_Bazar"],
  ['Dhaka', 'Rajshahi'], ['Dhaka', 'Khulna'], ['Chattogram', 'Sylhet'],
];

export const PopularRoutes = () => {
  const { t } = useT();
  const { trains, loading } = useNetwork();

  const routes = useMemo(() => POPULAR.map(([from, to]) => {
    const list = trainsBetween(trains, from, to);
    const fastest = list.reduce((best, x) => Math.min(best, durationMinutes(x.dep, x.arr)), Infinity);
    const fastestTrip = list.find((x) => durationMinutes(x.dep, x.arr) === fastest);
    return { from, to, count: list.length, fastestTrip };
  }), [trains]);

  return (
    <section className="stack" aria-labelledby="popular-title">
      <SectionHead eyebrow={t('Popular routes')} title={t('Where people travel most')} id="popular-title" />
      <div className="route-grid">
        {routes.map((r) => (
          <Link key={`${r.from}-${r.to}`} to={searchLink(r.from, r.to)} className="card route-card">
            <div className="rc-cities">
              <span>{stationName(r.from)}</span>
              <Icon name="train" size={16} />
              <span>{stationName(r.to)}</span>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 18, width: '70%' }} />
            ) : (
              <div className="rc-meta">
                <span>{t('{count} trains a day', { count: num(r.count) })}</span>
                {r.fastestTrip && (
                  <span><Icon name="clock" size={14} /> {t('Fastest {time}', { time: formatDuration(r.fastestTrip.dep, r.fastestTrip.arr) })}</span>
                )}
              </div>
            )}
            <span className="rc-cta">{t('See trains')} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

/* ---------- Departure board ---------- */
const BOARD_STATIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet'];

export const DepartureBoard = () => {
  const { t } = useT();
  const { trains, loading, error } = useNetwork();
  const [station, setStation] = useState('Dhaka');
  const [now, setNow] = useState(dhakaNow);

  // Refresh "departs in" once a minute
  useEffect(() => {
    const id = setInterval(() => setNow(dhakaNow()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    if (!trains) return [];
    return trains
      .filter((train) => runsOn(train, now.weekday))
      .flatMap((train) => {
        const i = train.stops.findIndex((s) => s.station === station);
        if (i === -1 || i === train.stops.length - 1) return []; // not here, or terminates here
        const dep = train.stops[i].departure;
        const wait = (toMinutes(dep) - now.minutes + 1440) % 1440;
        return [{ train, dep, wait, dest: train.stops[train.stops.length - 1].station, origin: i === 0 }];
      })
      .filter((r) => r.wait <= 12 * 60)
      .sort((a, b) => a.wait - b.wait)
      .slice(0, 8);
  }, [trains, station, now]);

  const waitText = (m) => {
    if (m < 1) return t('Now');
    if (m < 60) return t('in {m} min', { m: num(m) });
    return t('in {h}h {m}m', { h: num(Math.floor(m / 60)), m: num(m % 60) });
  };

  return (
    <section className="stack" aria-labelledby="board-title">
      <SectionHead eyebrow={t('Departing soon')} title={t('Next trains from {station}', { station: stationName(station) })} id="board-title" />
      <div className="row" role="group" aria-label={t('Station')}>
        {BOARD_STATIONS.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={station === s} onClick={() => setStation(s)}>
            {stationName(s)}
          </button>
        ))}
      </div>

      <div className="board" aria-live="polite">
        <div className="board-row board-head" aria-hidden="true">
          <span>{t('Time')}</span><span>{t('Train')}</span><span>{t('To')}</span><span>{t('Departs')}</span>
        </div>
        {loading && <div className="board-empty">{t('Loading timetable')}…</div>}
        {error && <div className="board-empty">{t('Could not load the timetable. Is the server running?')}</div>}
        {!loading && !error && rows.length === 0 && <div className="board-empty">{t('No more intercity departures in the next 12 hours.')}</div>}
        {rows.map((r) => (
          <Link key={r.train.train_code} to={searchLink(station, r.dest)} className="board-row">
            <span className="board-time">{formatTime(r.dep)}</span>
            <span className="board-train">
              {trainLabel(r.train.name)}
              <small>#{num(r.train.train_code)}</small>
            </span>
            <span className="board-dest">{stationName(r.dest)}</span>
            <span className={`board-wait${r.wait <= 30 ? ' soon' : ''}`}>{waitText(r.wait)}</span>
          </Link>
        ))}
      </div>
      <p className="tiny muted">
        {t('Scheduled times from the official Bangladesh Railway timetable (Bangladesh time). Trains on their weekly off day are hidden.')}
      </p>
    </section>
  );
};

/* ---------- Route explorer: pick a route from the route table, see it on the map ---------- */
export const NetworkSection = () => {
  const { t } = useT();
  const { routes, loading, error } = useRoutes();
  const [routeId, setRouteId] = useState(null);

  // Start on a random route
  useEffect(() => {
    if (routeId === null && routes?.length) setRouteId(routes[Math.floor(Math.random() * routes.length)].id);
  }, [routes, routeId]);

  const route = routes?.find((r) => r.id === routeId);
  const stops = useMemo(() => (route ? route.stations.map((name) => ({ name })) : []), [route]);
  const label = (r) => {
    const [from, to] = [r.stations[0], r.stations[r.stations.length - 1]];
    const base = `${stationName(from)} → ${stationName(to)}`;
    return r.via ? `${base} (${t('via {place}', { place: stationName(r.via) })})` : base;
  };

  return (
    <section className="stack" aria-labelledby="network-title">
      <SectionHead eyebrow={t('Rail network')} title={t('Explore a train route')} id="network-title" />

      <div className="card card-pad stack">
        <div className="explorer-bar">
          <label htmlFor="route-pick" className="sr-only">{t('Choose a route')}</label>
          <select
            id="route-pick"
            className="select"
            value={routeId ?? ''}
            onChange={(e) => setRouteId(Number(e.target.value))}
            disabled={!routes?.length}
          >
            {(routes || []).map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}
          </select>
          {route && (
            <Link to={searchLink(route.stations[0], route.stations[route.stations.length - 1])} className="btn btn-primary">
              <Icon name="ticket" size={16} /> {t('Book this route')}
            </Link>
          )}
        </div>

        {loading && <div className="skeleton" style={{ height: 440 }} />}
        {error && <div className="board-empty" style={{ color: 'var(--muted)' }}>{t('Could not load the timetable. Is the server running?')}</div>}
        {route && (
          <>
            <RouteMap stops={stops} height={440} />
            <p className="tiny muted">
              {t('{count} stations', { count: num(route.stations.length) })} · {t('Click a station point to see its name.')}
            </p>
          </>
        )}
      </div>
    </section>
  );
};

/* ---------- Travel tips & FAQ ---------- */
const FAQ = [
  ['How far ahead can I book?', 'You can book up to 10 days before the journey. Tickets for busy routes sell out fast, so book as soon as the window opens.'],
  ['What about Eid and other holidays?', 'Bangladesh Railway announces special advance-booking dates before Eid. Expect very high demand, book the moment sales open and avoid the last train of the day.'],
  ['Can I cancel and get a refund?', 'Yes. Cancel from your account up to 6 hours before departure. The amount refunded depends on how early you cancel; see the refund policy for the exact rates.'],
  ['What do I need to carry?', 'Your ticket (on your phone or printed) and a photo ID with the same name as the booking. Ticket checkers may ask for both.'],
  ['What is a weekly off day?', 'Most intercity trains rest one day a week. The search only shows trains that run on your chosen date.'],
  ['How early should I reach the station?', 'Arrive at least 30 minutes before departure. Big stations such as Kamalapur and Chattogram can be crowded, and boarding closes when the train is ready to leave.'],
];

export const TravelFaq = () => {
  const { t } = useT();
  return (
    <section className="stack" aria-labelledby="faq-title">
      <SectionHead eyebrow={t('Travel tips')} title={t('Good to know before you go')} id="faq-title">
        <Link to="/about#refunds" className="btn btn-ghost btn-sm"><Icon name="refund" size={16} /> {t('Refund policy')}</Link>
      </SectionHead>
      <div className="faq">
        {FAQ.map(([q, a]) => (
          <details key={q} className="faq-item">
            <summary>{t(q)}</summary>
            <p className="muted">{t(a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
};
