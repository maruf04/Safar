import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAuth, API_URL } from './utils';
import { Alert, EmptyState, Icon } from './ui';
import RoutePanel, { useTrainDetails } from './RoutePanel';
import { num } from '../lib/format';
import { useT } from '../i18n';

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
  const { data: trainData, loading: isLoading, error } = useTrainDetails(selected);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = trainName.trim();
    if (!trimmed) return;
    const match = trainOptions.find((n) => n.toLowerCase() === trimmed.toLowerCase());
    setSearchParams({ train: match || trimmed });
  };

  const leg = trainData ? (trainData.UP || trainData.DOWN) : null;

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

      <section className="container section stack" aria-live="polite">
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
            <RoutePanel data={trainData} mapHeight={480} />
          </div>
        )}
      </section>
    </>
  );
};

export default SearchTrain;
