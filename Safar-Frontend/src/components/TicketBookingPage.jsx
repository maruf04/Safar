import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Popup from './Popup';
import { API_URL } from './utils';
import { useData } from './AppContext';
import { Alert, EmptyState, Icon, Modal, Spinner } from './ui';
import { formatDate, taka, num, localizeDigits, stationName } from '../lib/format';
import { useT } from '../i18n';

const HOLD_SECONDS = 300; // seats are held for 5 minutes

const PAYMENT_METHODS = [
  { id: 'bkash', label: 'bKash', img: 'bkash4.png' },
  { id: 'nagad', label: 'Nagad', img: 'nagad.png' },
];

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const TicketBookingPage = () => {
  const { t } = useT();
  const location = useLocation();
  const { userId } = useData();
  const ticketId = location.state?.ticketId;

  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // 'pending' | 'paid' | 'cancelled' | 'expired'
  const [status, setStatus] = useState('pending');

  const [timeLeft, setTimeLeft] = useState(HOLD_SECONDS);
  const timerRef = useRef(null);
  const [popup, setPopup] = useState({ show: false, message: '' });

  // Fetch ticket details
  useEffect(() => {
    if (!ticketId) {
      setError(t('No ticket to show. Start by searching for a train.'));
      return;
    }
    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_URL}/booking/getTicket`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ ticket_id: ticketId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch ticket data');
        setTicketData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Countdown (paused while the payment dialog is open, like before)
  useEffect(() => {
    if (!ticketData || payModalOpen || status !== 'pending') return undefined;
    timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [ticketData, payModalOpen, status]);

  const cancelOnServer = useCallback(async () => {
    const response = await fetch(`${API_URL}/booking/cancelTicket`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ticket_id: ticketId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Cancellation failed');
    }
  }, [ticketId]);

  // Auto-cancel when the hold expires
  useEffect(() => {
    if (timeLeft > 0 || status !== 'pending') return;
    clearInterval(timerRef.current);
    setPayModalOpen(false);
    setStatus('expired');
    cancelOnServer().catch((err) =>
      setPopup({ show: true, message: t('Error auto-cancelling ticket: {msg}', { msg: err.message }) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, status, cancelOnServer]);

  const openPayModal = () => {
    if (!paymentMethod) {
      setPopup({ show: true, message: t('Please choose a payment method first.') });
      return;
    }
    setAmount('');
    setAmountError('');
    setPayModalOpen(true);
  };

  const handleConfirmPayment = (e) => {
    e.preventDefault();
    if (!amount.trim()) {
      setAmountError(t('Please enter the amount.'));
      return;
    }
    if (amount.trim() !== ticketData.total_cost.toString()) {
      setAmountError(t('The amount must match the total of {amount}.', { amount: taka(ticketData.total_cost) }));
      return;
    }
    clearInterval(timerRef.current);
    setPayModalOpen(false);
    setStatus('paid');
  };

  const handleCancelTicket = async () => {
    setCancelling(true);
    try {
      await cancelOnServer();
      clearInterval(timerRef.current);
      setCancelModalOpen(false);
      setStatus('cancelled');
    } catch (err) {
      setPopup({ show: true, message: t('Error: {msg}', { msg: err.message }) });
    } finally {
      setCancelling(false);
    }
  };

  const minutes = Math.max(0, Math.floor(timeLeft / 60));
  const seconds = Math.max(0, timeLeft % 60);
  const formattedTimer = localizeDigits(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  const method = PAYMENT_METHODS.find((m) => m.id === paymentMethod);

  const header = (title, subtitle) => (
    <section className="band">
      <div className="container container-sm">
        <h1>{t(title)}</h1>
        {subtitle && <p style={{ marginTop: 6 }}>{t(subtitle)}</p>}
      </div>
    </section>
  );

  if (loading || (!ticketData && !error)) {
    return (
      <>
        {header('Your ticket')}
        <div className="container container-sm overlap">
          <div className="skeleton" style={{ height: 420 }} aria-label={t('Loading ticket')} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {header('Your ticket')}
        <div className="container container-sm overlap section">
          <div className="card">
            <EmptyState
              icon="ticket"
              title={t('Ticket not found')}
              action={<Link to="/booking/train/search" className="btn btn-primary">{t('Search trains')}</Link>}
            >
              {error}
            </EmptyState>
          </div>
        </div>
      </>
    );
  }

  if (status !== 'pending') {
    const outcomes = {
      paid: {
        icon: 'check', title: 'Payment confirmed',
        text: t('Paid {amount} with {method}. Have a good journey!', { amount: taka(ticketData.total_cost), method: method ? t(method.label) : paymentMethod }),
      },
      cancelled: { icon: 'close', title: 'Ticket cancelled', text: t('Your reservation was cancelled and the seats were released.') },
      expired: { icon: 'clock', title: 'Time ran out', text: t('Payment wasn’t completed within 5 minutes, so the ticket was cancelled automatically.') },
    };
    const o = outcomes[status];
    return (
      <>
        {header(o.title)}
        <div className="container container-sm overlap section">
          <div className="card">
            <EmptyState
              icon={o.icon}
              title={t(o.title)}
              action={
                <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
                  {status === 'paid' && userId && <Link to={`/users/${userId}`} className="btn btn-primary">{t('View my tickets')}</Link>}
                  {status !== 'paid' && <Link to="/booking/train/search" className="btn btn-primary">{t('Search again')}</Link>}
                  <Link to="/" className="btn btn-ghost">{t('Go home')}</Link>
                </div>
              }
            >
              {o.text}
            </EmptyState>
          </div>
        </div>
        {popup.show && <Popup message={popup.message} onClose={() => setPopup({ show: false, message: '' })} />}
      </>
    );
  }

  return (
    <>
      {header('Complete your booking', 'Your seats are on hold. Pay before the timer runs out.')}

      <div className="container container-sm overlap section stack-lg">
        <div className={`timer${timeLeft <= 60 ? ' urgent' : ''}`} role="timer" aria-live="off">
          <span className="row" style={{ gap: 8 }}>
            <Icon name="clock" /> <span className="strong">{t('Time left to pay')}</span>
          </span>
          <span className="timer-value">{formattedTimer}</span>
        </div>

        <article className="ticket" aria-label={t('Ticket details')}>
          <div className="ticket-top row-between">
            <div>
              <p className="small muted">{t('Train #{code}', { code: num(ticketData.train_code) })}</p>
              <h2 className="h2" style={{ color: '#fff' }}>{ticketData.train_name}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="small muted">{t('Total')}</p>
              <p className="h2 num" style={{ color: '#fff' }}>{taka(ticketData.total_cost)}</p>
            </div>
          </div>
          <div className="ticket-body">
            <div className="journey">
              <div>
                <div className="eyebrow">{t('From')}</div>
                <div className="h3">{stationName(ticketData.From)}</div>
              </div>
              <div className="journey-line"><span className="bar" /></div>
              <div style={{ textAlign: 'right' }}>
                <div className="eyebrow">{t('To')}</div>
                <div className="h3">{stationName(ticketData.To)}</div>
              </div>
            </div>
          </div>
          <div className="ticket-tear" aria-hidden="true" />
          <div className="ticket-body">
            <dl className="kv">
              <div><dt>{t('Journey date')}</dt><dd>{formatDate(ticketData.Journey_date)}</dd></div>
              <div><dt>{t('Ticket ID')}</dt><dd className="num">{num(ticketId)}</dd></div>
              {(ticketData.Seat_details || []).map((cls, idx) => (
                <div key={idx}><dt>{t('Seats')} · {cls.class_code}</dt><dd>{num([...cls.seats].sort((a, b) => a - b).join(', '))}</dd></div>
              ))}
            </dl>
          </div>
        </article>

        <section className="card card-pad stack" aria-labelledby="pay-title">
          <h2 id="pay-title" className="h3">{t('Payment method')}</h2>
          <div className="pay-options" role="radiogroup" aria-label={t('Payment method')}>
            {PAYMENT_METHODS.map((m) => (
              <label key={m.id} className="pay-option">
                <input
                  type="radio"
                  name="payment"
                  value={m.id}
                  checked={paymentMethod === m.id}
                  onChange={() => setPaymentMethod(m.id)}
                />
                <img src={`${process.env.PUBLIC_URL}/${m.img}`} alt="" />
                <span>{t(m.label)}</span>
              </label>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <button type="button" className="btn btn-danger-outline" onClick={() => setCancelModalOpen(true)}>
              {t('Cancel ticket')}
            </button>
            <button type="button" className="btn btn-primary btn-lg" onClick={openPayModal}>
              {t('Pay {amount}', { amount: taka(ticketData.total_cost) })} <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </section>
      </div>

      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title={t('Pay with {method}', { method: method ? t(method.label) : '' })}
        icon="wallet"
      >
        <form onSubmit={handleConfirmPayment} className="stack">
          <p className="muted small">{t('The timer is paused while this window is open.')}</p>
          <div className="field">
            <label htmlFor="pay-amount">{t('Amount (taka)')}</label>
            <input
              id="pay-amount"
              className="input"
              inputMode="decimal"
              placeholder={t('Enter {amount}', { amount: ticketData.total_cost })}
              value={amount}
              aria-invalid={!!amountError}
              aria-describedby={amountError ? 'pay-amount-error' : undefined}
              onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
              autoFocus
            />
            {amountError && <span id="pay-amount-error" className="field-error">{amountError}</span>}
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg">{t('Confirm payment')}</button>
        </form>
      </Modal>

      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={t('Cancel this ticket?')}
        icon="alert"
        tone="danger"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCancelModalOpen(false)}>{t('Keep ticket')}</button>
            <button type="button" className="btn btn-danger" onClick={handleCancelTicket} disabled={cancelling}>
              {cancelling ? <Spinner label={t('Cancelling…')} /> : t('Yes, cancel')}
            </button>
          </>
        }
      >
        <Alert tone="warn">{t('Your reserved seats will be released for other passengers.')}</Alert>
      </Modal>

      {popup.show && <Popup message={popup.message} onClose={() => setPopup({ show: false, message: '' })} />}
    </>
  );
};

export default TicketBookingPage;
