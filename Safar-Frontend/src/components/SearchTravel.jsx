import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from './AppContext';
import { fetchWithAuth, API_URL } from './utils';
import SearchForm from './SearchForm';
import { Alert, EmptyState, Icon, Modal } from './ui';
import RoutePanel, { useTrainDetails } from './RoutePanel';
import { formatDate, formatDuration, formatTime, durationMinutes, hourOf, taka, num, stationName, trainLabel } from '../lib/format';
import { useT } from '../i18n';

const TIME_FILTERS = [
  { id: 'all', label: 'Any time' },
  { id: 'morning', label: 'Morning', test: (h) => h >= 4 && h < 12 },
  { id: 'afternoon', label: 'Afternoon', test: (h) => h >= 12 && h < 18 },
  { id: 'night', label: 'Evening & night', test: (h) => h >= 18 || h < 4 },
];

const seatsLeft = (cls) => {
  const booked = Array.isArray(cls.Booked_Seats) ? cls.Booked_Seats.length : 0;
  return Math.max(0, (cls.total_seat || 0) - booked);
};

const cheapestFare = (train) => {
  const fares = (train.classes || [])
    .map((c) => parseFloat(c.seat_cost))
    .filter((n) => !Number.isNaN(n));
  return fares.length ? Math.min(...fares) : null;
};

// Popup with the train's real route map and stop-by-stop timetable.
// Closes with the Cancel button, the X, Escape, or a click outside the popup.
const RouteModal = ({ train, from, to, onClose }) => {
  const { t } = useT();
  const { data, loading, error } = useTrainDetails(train?.train_name);
  const highlight = useMemo(() => ({ from, to }), [from, to]);

  return (
    <Modal
      open={!!train}
      onClose={onClose}
      size="xl"
      title={train ? `${trainLabel(train.train_name)} · ${t('Route & stops')}` : ''}
      footer={<button type="button" className="btn btn-ghost" onClick={onClose}>{t('Cancel')}</button>}
    >
      {train && (
        <p className="small muted" style={{ marginTop: -8 }}>
          {t('Train #{code}', { code: num(train.train_code) })} · {t('Your journey: {from} → {to}', { from: stationName(from), to: stationName(to) })}
        </p>
      )}
      {loading && <div className="skeleton" style={{ height: 380 }} aria-label={t('Loading timetable')} />}
      {error && !loading && <Alert tone="danger">{error}</Alert>}
      {data && !loading && <RoutePanel data={data} highlight={highlight} mapHeight={440} />}
    </Modal>
  );
};

const TrainCard = ({ train, from, to, date, onShowRoute }) => {
  const { t } = useT();
  const dep = train.from_station_departure;
  const arr = train.to_station_arrival;
  const fare = cheapestFare(train);

  return (
    <article className="card train-card" aria-label={t('{name}, departs {time}', { name: trainLabel(train.train_name), time: formatTime(dep) })}>
      <div className="train-head">
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="train-name">{trainLabel(train.train_name)}</span>
          <span className="tiny muted">{t('Train #{code}', { code: num(train.train_code) })}</span>
        </div>
        {fare !== null && (
          <div style={{ textAlign: 'right' }}>
            <span className="tiny muted">{t('from')}</span>
            <div className="price" style={{ fontSize: 22 }}>{taka(fare)}</div>
          </div>
        )}
      </div>

      <div className="journey">
        <div>
          <div className="journey-time">{formatTime(dep)}</div>
          <div className="journey-station">{stationName(from)}</div>
        </div>
        <div className="journey-line">
          <span>{formatDuration(dep, arr)}</span>
          <span className="bar" />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="journey-time">{formatTime(arr)}</div>
          <div className="journey-station">{stationName(to)}</div>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onShowRoute(train)}>
          <Icon name="route" size={16} /> {t('Route & stops')}
        </button>
      </div>

      <div className="class-grid">
        {(train.classes || []).map((cls) => {
          const left = seatsLeft(cls);
          const cost = parseFloat(cls.seat_cost);
          const params = new URLSearchParams({
            trainCode: train.train_code,
            className: cls.class_name,
            classCode: cls.class_code,
            date,
            from,
            to,
            seat_cost: cls.seat_cost,
          });
          return (
            <div key={cls.class_code ?? cls.class_name} className={`class-tile${left === 0 ? ' soldout' : left <= 10 ? ' low' : ''}`}>
              <div className="ct-row">
                <span className="ct-name">{cls.class_name}</span>
                {!Number.isNaN(cost) && <span className="price">{taka(cost)}</span>}
              </div>
              <div className="ct-row">
                {left === 0 ? (
                  <span className="badge badge-soldout"><Icon name="close" size={13} /> {t('Sold out')}</span>
                ) : (
                  <span className={`badge ${left <= 10 ? 'badge-warn' : ''}`}>
                    {t('{left} of {total} seats left', { left, total: cls.total_seat })}
                  </span>
                )}
              </div>
              {left > 0 ? (
                <Link to={`/bookseat?${params.toString()}`} className="btn btn-outline btn-sm btn-block">
                  {t('Choose seats')}
                </Link>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm btn-block" disabled>{t('Unavailable')}</button>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
};

const SearchTravel = () => {
  const { t } = useT();
  const { setDates, setFromStationSearch, setToStationSearch } = useData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';

  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [sort, setSort] = useState('departure');
  const [routeTrain, setRouteTrain] = useState(null);

  // Run the search whenever the URL has a complete query
  useEffect(() => {
    if (!from || !to || !date) return;
    let cancelled = false;

    (async () => {
      setDates(new Date(`${date}T00:00:00`));
      setFromStationSearch(from);
      setToStationSearch(to);
      setLoading(true);
      setError('');
      setSearched(true);
      try {
        const response = await fetchWithAuth(`${API_URL}/booking/search`, {
          method: 'POST',
          body: JSON.stringify({ fromcity: from, tocity: to, doj: date }),
        }, navigate);
        const res = await response.json();
        if (cancelled) return;
        if (response.ok) {
          setTrains(res.data || []);
        } else {
          setTrains([]);
          setError(res.message || t('Search failed. Please try again.'));
        }
      } catch (err) {
        if (!cancelled) {
          setTrains([]);
          setError(t('Something went wrong with the search. Is the server running?'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, date]);

  const visible = useMemo(() => {
    const f = TIME_FILTERS.find((x) => x.id === timeFilter);
    const list = trains.filter((t) => !f?.test || f.test(hourOf(t.from_station_departure)));
    const sorted = [...list];
    if (sort === 'departure') {
      sorted.sort((a, b) => (a.from_station_departure || '').localeCompare(b.from_station_departure || ''));
    } else if (sort === 'duration') {
      sorted.sort((a, b) =>
        durationMinutes(a.from_station_departure, a.to_station_arrival) -
        durationMinutes(b.from_station_departure, b.to_station_arrival));
    } else if (sort === 'price') {
      sorted.sort((a, b) => (cheapestFare(a) ?? Infinity) - (cheapestFare(b) ?? Infinity));
    }
    return sorted;
  }, [trains, timeFilter, sort]);

  const handleSearch = (q) => setSearchParams(q);

  return (
    <>
      <section className="band">
        <div className="container">
          {from && to ? (
            <>
              <p className="eyebrow">{date ? formatDate(date) : t('Search')}</p>
              <h1 style={{ marginTop: 6 }}>{stationName(from)} <span aria-hidden="true">→</span><span className="sr-only">{t('to')}</span> {stationName(to)}</h1>
            </>
          ) : (
            <h1>{t('Where are you headed?')}</h1>
          )}
        </div>
      </section>

      <div className="container overlap">
        <SearchForm initial={{ from, to, date }} onSubmit={handleSearch} submitLabel="Search" />
      </div>

      <section className="container section stack" aria-live="polite">
        {searched && !loading && trains.length > 0 && (
          <div className="row-between">
            <div className="row" role="group" aria-label={t('Filter by departure time')}>
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="chip"
                  aria-pressed={timeFilter === f.id}
                  onClick={() => setTimeFilter(f.id)}
                >
                  {t(f.label)}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <label htmlFor="sort" className="small muted">{t('Sort by')}</label>
              <select id="sort" className="select" style={{ width: 'auto', minHeight: 40 }} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="departure">{t('Departure time')}</option>
                <option value="duration">{t('Shortest journey')}</option>
                <option value="price">{t('Lowest fare')}</option>
              </select>
            </div>
          </div>
        )}

        {loading && (
          <div className="stack" aria-label={t('Loading trains')}>
            {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 190 }} />)}
          </div>
        )}

        {error && !loading && <Alert tone="danger">{error}</Alert>}

        {!searched && !loading && (
          <div className="card">
            <EmptyState icon="train" title={t('Search for a train')}>
              {t('Choose your stations and journey date above to see available trains and seats.')}
            </EmptyState>
          </div>
        )}

        {searched && !loading && !error && trains.length === 0 && (
          <div className="card">
            <EmptyState icon="calendar" title={t('No trains on this date')}>
              {t('No trains run from {from} to {to} on {date}. Try another date or swap the stations.', { from: stationName(from), to: stationName(to), date: formatDate(date) })}
            </EmptyState>
          </div>
        )}

        {!loading && trains.length > 0 && (
          <>
            <p className="small muted">
              {t('Showing {shown} of {total} trains', { shown: visible.length, total: trains.length })}
            </p>
            {visible.length === 0 && (
              <div className="card">
                <EmptyState icon="clock" title={t('No trains at this time of day')}>
                  {t('Try another time filter.')}
                </EmptyState>
              </div>
            )}
            {visible.map((train) => (
              <TrainCard key={train.train_code} train={train} from={from} to={to} date={date} onShowRoute={setRouteTrain} />
            ))}
          </>
        )}

        {searched && !loading && trains.length > 0 && (
          <p className="tiny muted row" style={{ gap: 6 }}>
            <Icon name="info" size={14} /> {t('You need to be signed in to reserve seats.')}
          </p>
        )}
      </section>

      <RouteModal train={routeTrain} from={from} to={to} onClose={() => setRouteTrain(null)} />
    </>
  );
};

export default SearchTravel;
