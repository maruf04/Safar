import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth, API_URL } from './utils';
import { Alert, EmptyState, Icon } from './ui';
import { formatTime, num, stationName } from '../lib/format';
import { useT } from '../i18n';

const Timetable = ({ leg }) => {
  const { t } = useT();
  const rows = leg.timetable || [];
  const last = rows[rows.length - 1];
  return (
    <ol className="timeline">
      {rows.map((row, idx) => (
        <li key={idx} className="tl-item">
          <span className="tl-time">{formatTime(row.departure_time || row.arrival_time)}</span>
          <span className="tl-rail" aria-hidden="true"><span className="tl-dot" /><span className="tl-line" /></span>
          <div className="tl-body">
            <div className="tl-station">{stationName(row.from_station)}</div>
            <div className="tl-meta">
              {idx === 0 ? t('Departs') : t('Arrives {arr} · departs {dep}', { arr: formatTime(row.arrival_time), dep: formatTime(row.departure_time) })}
              {row.duration && <> · {t('{duration} to {station}', { duration: num(row.duration), station: stationName(row.to_station) })}</>}
            </div>
          </div>
        </li>
      ))}
      {last && (
        <li className="tl-item">
          <span className="tl-time" />
          <span className="tl-rail" aria-hidden="true"><span className="tl-dot" /><span className="tl-line" /></span>
          <div className="tl-body">
            <div className="tl-station">{stationName(last.to_station)}</div>
            <div className="tl-meta">{t('Final stop')}</div>
          </div>
        </li>
      )}
    </ol>
  );
};

const SearchTrain = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trainName, setTrainName] = useState(searchParams.get('train') || '');
  const [trainOptions, setTrainOptions] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('train_names') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [trainData, setTrainData] = useState(null);
  const [direction, setDirection] = useState('UP');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load the list of train names
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/booking/allTrainNames`, {}, navigate);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.name)) {
          setTrainOptions(data.name);
          localStorage.setItem('train_names', JSON.stringify(data.name));
        }
      } catch (e) {
        // keep whatever was cached
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = searchParams.get('train') || '';

  // Fetch the timetable whenever the selected train in the URL changes
  useEffect(() => {
    if (!selected) return;
    (async () => {
      setIsLoading(true);
      setError('');
      setTrainData(null);
      try {
        const res = await fetchWithAuth(`${API_URL}/booking/trainDetails`, {
          method: 'POST',
          body: JSON.stringify({ train_name: selected }),
        }, navigate);
        const data = await res.json();
        if (!res.ok || !data || data.success === false) throw new Error(data.error || t('Train not found'));
        setTrainData(data);
        setDirection(data.UP ? 'UP' : 'DOWN');
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = trainName.trim();
    if (!trimmed) return;
    const match = trainOptions.find((n) => n.toLowerCase() === trimmed.toLowerCase());
    setSearchParams({ train: match || trimmed });
  };

  const legs = trainData ? ['UP', 'DOWN'].filter((d) => trainData[d]) : [];
  const leg = trainData?.[direction];

  return (
    <>
      <section className="band">
        <div className="container">
          <p className="eyebrow">{t('Timetable')}</p>
          <h1 style={{ marginTop: 6 }}>{leg ? leg.train_name : t('Find a train’s schedule')}</h1>
          {leg && <p style={{ marginTop: 6 }}>{t('Train #{code}', { code: num(leg.train_code) })} · {leg.route_name}</p>}
        </div>
      </section>

      <div className="container container-sm overlap">
        <form onSubmit={handleSearch} className="searchbar" role="search" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
          <div className="sb-field" style={{ borderBottom: 0, borderRight: 0 }}>
            <label htmlFor="train-name">{t('Train name')}</label>
            <input
              id="train-name"
              className="sb-input"
              list="train-list"
              placeholder={t('Start typing a train name')}
              autoComplete="off"
              value={trainName}
              onChange={(e) => setTrainName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-lg sb-submit">
            <Icon name="search" size={18} /> <span>{t('Show')}</span>
          </button>
          <datalist id="train-list">
            {trainOptions.map((n) => <option key={n} value={n} />)}
          </datalist>
        </form>
      </div>

      <section className="container container-sm section stack" aria-live="polite">
        {isLoading && <div className="skeleton" style={{ height: 400 }} aria-label={t('Loading timetable')} />}
        {error && !isLoading && <Alert tone="danger">{error}</Alert>}

        {!selected && !isLoading && (
          <div className="card">
            <EmptyState icon="route" title={t('Pick a train')}>
              {t('Start typing a train name above to see every stop, with arrival and departure times for both directions.')}
            </EmptyState>
          </div>
        )}

        {leg && !isLoading && (
          <div className="card card-pad stack">
            {legs.length > 1 && (
              <div className="tabs" role="tablist" aria-label={t('Direction')}>
                {legs.map((d) => (
                  <button key={d} type="button" role="tab" className="tab" aria-selected={direction === d} onClick={() => setDirection(d)}>
                    {trainData[d].route_name || (d === 'UP' ? t('Up train') : t('Down train'))}
                  </button>
                ))}
              </div>
            )}
            <Timetable leg={leg} />
          </div>
        )}
      </section>
    </>
  );
};

export default SearchTrain;
