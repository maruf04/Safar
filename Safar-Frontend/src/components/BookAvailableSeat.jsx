import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_URL } from './utils';
import { useData } from './AppContext';
import Popup from './Popup';
import { Alert, Icon, Spinner } from './ui';
import { formatDate, taka, num, stationName } from '../lib/format';
import { useT } from '../i18n';

const MAX_SEATS = 4;

const classCodeMap = {
  '2nd General': '1',
  '2nd Mail': '2',
  'Commuter': '3',
  'Sulav': '4',
  'Shovon': '5',
  'Shovon Chair': '6',
  '1st Chair/ Seat': '7',
  '1st Berth': '8',
  'Snigdha': '9',
  'AC seat': '10',
};

const BookAvailableSeat = () => {
  const { t } = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const { logOut, loginState } = useData();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const trainCode = params.get('trainCode') || '';
  const className = params.get('className') || '';
  const date = params.get('date') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const seatCost = parseFloat(params.get('seat_cost') || '0') || 0;

  const [trainName, setTrainName] = useState('');
  const [totalSeat, setTotalSeat] = useState(0);
  const [booked, setBooked] = useState(new Set());
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [popup, setPopup] = useState({ show: false, message: '' });
  const [popupCallback, setPopupCallback] = useState(null);

  const signedIn = loginState || !!localStorage.getItem('token');

  useEffect(() => {
    if (!trainCode || !className || !date || !from || !to) {
      setLoading(false);
      setLoadError(t('Some booking details are missing. Please search for your train again.'));
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetchWithAuth(`${API_URL}/booking/search`, {
          method: 'POST',
          body: JSON.stringify({ fromcity: from, tocity: to, doj: date }),
        }, navigate);
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok || !data.data || data.data.length === 0) {
          setLoadError(t('Could not load seat data for this train.'));
          return;
        }
        const train = data.data.find((t) => String(t.train_code) === String(trainCode));
        if (!train) { setLoadError(t('This train was not found for the selected date.')); return; }
        setTrainName(train.train_name);

        const cls = train.classes.find((c) => c.class_name === className);
        if (!cls) { setLoadError(t('This class was not found on the train.')); return; }

        setTotalSeat(cls.total_seat);
        setBooked(new Set(cls.Booked_Seats || []));
      } catch (err) {
        if (!cancelled) setLoadError(t('Error fetching seat data. Is the server running?'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const availableCount = totalSeat - booked.size;
  const totalCost = selected.length * seatCost;

  const toggleSeat = (n) => {
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((s) => s !== n);
      if (prev.length >= MAX_SEATS) {
        setPopup({ show: true, message: t('You can select up to {n} seats per booking.', { n: MAX_SEATS }) });
        return prev;
      }
      return [...prev, n].sort((a, b) => a - b);
    });
  };

  const handleBooking = async () => {
    if (selected.length === 0) {
      setPopup({ show: true, message: t('Please select at least one seat.') });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/booking/reserve`, {
        method: 'POST',
        body: JSON.stringify({
          Train_Code: trainCode,
          Date: date,
          From_Station: from,
          To_Station: to,
          Seat_Details: [{ Class_Code: classCodeMap[className] || '1', Seat_Number: selected }],
        }),
      }, navigate, logOut);
      const json = await res.json();

      if (res.ok) {
        navigate('/booking/ticket', { state: { ticketId: json.ticket_id } });
      } else if (res.status === 413) {
        setPopup({ show: true, message: t('You already have a ticket on this date, so you can’t book another one.') });
        setPopupCallback(() => () => navigate('/booking/train/search'));
      } else {
        setPopup({ show: true, message: json.message || t('Booking failed. Please try again.') });
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        setPopup({ show: true, message: t('Booking failed due to a network error.') });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderSeat = (n) => {
    if (n > totalSeat) return <span key={n} className="seat-spacer" aria-hidden="true" />;
    const isBooked = booked.has(n);
    const isSelected = selected.includes(n);
    return (
      <button
        key={n}
        type="button"
        className="seat"
        disabled={isBooked}
        aria-pressed={isSelected}
        aria-label={t(isBooked ? 'Seat {n}, booked' : isSelected ? 'Seat {n}, selected' : 'Seat {n}, available', { n })}
        onClick={() => toggleSeat(n)}
      >
        {num(n)}
      </button>
    );
  };

  // AC seat coaches are 2 + 2; all other classes are 2 + 3
  const layout = className === 'AC seat' ? [2, 2] : [2, 3];
  const perRow = layout[0] + layout[1];
  const rows = [];
  for (let start = 1, r = 1; start <= totalSeat; start += perRow, r += 1) {
    rows.push(
      <div className="seat-row" key={start}>
        <div className="seat-group">
          {Array.from({ length: layout[0] }, (_, i) => renderSeat(start + i))}
        </div>
        <span className="seat-aisle" aria-hidden="true">{num(r)}</span>
        <div className="seat-group">
          {Array.from({ length: layout[1] }, (_, i) => renderSeat(start + layout[0] + i))}
        </div>
      </div>
    );
  }

  const searchAgainUrl = `/booking/train/search?${new URLSearchParams({ from, to, date }).toString()}`;

  return (
    <>
      <section className="band">
        <div className="container">
          <Link to={searchAgainUrl} className="row small" style={{ color: '#D7EEE4', gap: 6, textDecoration: 'none', marginBottom: 12 }}>
            <Icon name="arrowLeft" size={16} /> {t('Back to results')}
          </Link>
          <p className="eyebrow">{t('{cls} class', { cls: className })} · {formatDate(date)}</p>
          <h1 style={{ marginTop: 6 }}>{trainName || t('Choose your seats')}</h1>
          <p style={{ marginTop: 6 }}>{stationName(from)} → {stationName(to)}</p>
        </div>
      </section>

      <div className="container overlap">
        <div className="split">
          <section className="card card-pad stack" aria-labelledby="seatmap-title">
            <div className="row-between">
              <h2 id="seatmap-title" className="h3">{t('Pick up to {n} seats', { n: MAX_SEATS })}</h2>
              {!loading && !loadError && (
                <span className="badge">{t('{free} of {total} free', { free: availableCount, total: totalSeat })}</span>
              )}
            </div>

            {!signedIn && (
              <Alert tone="warn">
                {t('You need to sign in before you can reserve seats.')}{' '}
                <Link to="/users/login" state={{ from: `${location.pathname}${location.search}` }}>{t('Sign in')}</Link>
              </Alert>
            )}

            {loading && <div className="skeleton" style={{ height: 420 }} aria-label={t('Loading seat map')} />}
            {loadError && !loading && <Alert tone="danger">{loadError} <Link to={searchAgainUrl}>{t('Search again')}</Link></Alert>}

            {!loading && !loadError && (
              <>
                <div className="legend" aria-hidden="true">
                  <span><i /> {t('Available')}</span>
                  <span><i className="sel" /> {t('Selected')}</span>
                  <span><i className="off" /> {t('Booked')}</span>
                </div>
                <div className="coach" role="group" aria-label={t('{cls} coach seat map', { cls: className })}>
                  <span className="coach-front">{t('Front of coach')}</span>
                  {rows}
                </div>
              </>
            )}
          </section>

          <aside className="card card-pad stack" aria-label={t('Journey summary')}>
            <h2 className="h3">{t('Your journey')}</h2>
            <dl className="kv" style={{ gridTemplateColumns: '1fr' }}>
              <div><dt>{t('Train')}</dt><dd>{trainName || '—'} <span className="muted">#{num(trainCode)}</span></dd></div>
              <div><dt>{t('Route')}</dt><dd>{stationName(from)} → {stationName(to)}</dd></div>
              <div><dt>{t('Date')}</dt><dd>{formatDate(date)}</dd></div>
              <div><dt>{t('Class')}</dt><dd>{className} · {t('{price} per seat', { price: taka(seatCost) })}</dd></div>
            </dl>
            <hr className="divider" />
            <div className="row-between">
              <span className="muted">{t('Seats')}</span>
              <span className="strong">{selected.length ? num(selected.join(', ')) : t('None yet')}</span>
            </div>
            <div className="row-between">
              <span className="muted">{t('Total')}</span>
              <span className="price" style={{ fontSize: 24 }}>{taka(totalCost)}</span>
            </div>
            <p className="tiny muted">{t('After you continue, your seats are held for 5 minutes while you pay.')}</p>
          </aside>
        </div>
      </div>

      <div className="summary-bar" style={{ marginTop: 32 }}>
        <div className="container summary-inner">
          <div>
            <div className="small muted">
              {selected.length ? t('{n} seat(s): {list}', { n: selected.length, list: num(selected.join(', ')) }) : t('No seats selected')}
            </div>
            <div className="price" style={{ fontSize: 22, color: 'var(--ink)' }}>{taka(totalCost)}</div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleBooking}
            disabled={selected.length === 0 || submitting || !signedIn}
          >
            {submitting ? <Spinner label={t('Reserving…')} /> : <>{t('Continue to payment')} <Icon name="arrowRight" size={18} /></>}
          </button>
        </div>
      </div>

      {popup.show && (
        <Popup
          message={popup.message}
          onClose={() => {
            setPopup({ show: false, message: '' });
            if (popupCallback) { popupCallback(); setPopupCallback(null); }
          }}
        />
      )}
    </>
  );
};

export default BookAvailableSeat;
