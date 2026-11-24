import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useData } from './AppContext';
import { API_URL } from './utils';
import { Alert, EmptyState, Icon, Modal, Spinner } from './ui';
import { formatDate, initials, taka, num, stationName, phoneNumber } from '../lib/format';
import { useT } from '../i18n';

// "3 days 15:59:33.68" -> "3 days 15 hours 59 minutes"
const formatTimeRemaining = (timeString, t) => {
  if (!timeString) return t('N/A');
  if (timeString.startsWith('-')) return t('Journey completed');
  try {
    let days = 0;
    let timePart = timeString;
    const dayMatch = timeString.match(/^(\d+)\s+days?\s+(.*)$/);
    if (dayMatch) {
      days = parseInt(dayMatch[1], 10);
      timePart = dayMatch[2];
    }
    const parts = timePart.split(':');
    if (parts.length >= 3) {
      const hours = Math.abs(parseInt(parts[0], 10));
      const minutes = Math.abs(parseInt(parts[1], 10));
      const out = [];
      if (days > 0) out.push(`${num(days)} ${t(days !== 1 ? 'days' : 'day')}`);
      if (hours > 0) out.push(`${num(hours)} ${t(hours !== 1 ? 'hours' : 'hour')}`);
      if (minutes > 0 && days === 0) out.push(`${num(minutes)} ${t('min')}`);
      return out.join(' ') || t('less than a minute');
    }
    return timeString;
  } catch (e) {
    return timeString;
  }
};

// Tickets can be cancelled online until 6 hours before departure
const shouldShowCancelButton = (timeRemaining) => {
  if (timeRemaining === undefined || timeRemaining === null) return false;
  if (typeof timeRemaining === 'number') return timeRemaining >= 6;
  if (typeof timeRemaining !== 'string' || timeRemaining.startsWith('-')) return false;
  try {
    let days = 0;
    let timePart = timeRemaining;
    const dayMatch = timeRemaining.match(/^(\d+)\s+days?\s+(.*)$/);
    if (dayMatch) {
      days = parseInt(dayMatch[1], 10);
      timePart = dayMatch[2];
    }
    const t = timePart.split(':');
    if (t.length < 2) return false;
    const total = days * 1440 + (parseInt(t[0], 10) || 0) * 60 + (parseInt(t[1], 10) || 0);
    return total >= 360;
  } catch (e) {
    return false;
  }
};

const REFUND_RULES = [
  ['More than 48 hours before departure', '10% deduction (minimum BDT 40)'],
  ['24–48 hours before departure', '25% deduction (minimum BDT 40)'],
  ['12–24 hours before departure', '50% deduction (minimum BDT 40)'],
  ['6–12 hours before departure', '75% deduction (minimum BDT 40)'],
  ['Less than 6 hours before departure', 'No refund'],
];

const TicketGroup = ({ date, seats, onCancel }) => {
  const { t } = useT();
  const first = seats[0] || {};
  const completed = first.time_remaining?.startsWith('-');
  const canCancel = shouldShowCancelButton(first.time_remaining);

  return (
    <article className="card" aria-label={t('Ticket for {date}', { date: formatDate(date) })}>
      <div className="card-head row-between">
        <div className="stack-sm" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="calendar" size={18} />
            <span className="h3">{formatDate(date)}</span>
            {completed
              ? <span className="badge badge-neutral">{t('Completed')}</span>
              : <span className="badge">{t('Departs in {time}', { time: formatTimeRemaining(first.time_remaining, t) })}</span>}
          </div>
          <span className="small muted">
            {stationName(first.from_station)} → {stationName(first.to_station)}
            {first.arrival_time && ` · ${t('arrives {time}', { time: num(first.arrival_time.substring(0, 5)) })}`}
          </span>
        </div>
        <div className="row">
          {first.total_cost != null && <span className="price" style={{ fontSize: 20 }}>{taka(first.total_cost)}</span>}
          {canCancel && (
            <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => onCancel(first.ticket_id, date)}>
              {t('Cancel ticket')}
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t('Seat')}</th><th>{t('Class')}</th><th>{t('Train')}</th><th>{t('From')}</th><th>{t('To')}</th></tr>
            </thead>
            <tbody>
              {seats.map((seat, idx) => (
                <tr key={idx}>
                  <td className="strong num">{num(seat.seat_number)}</td>
                  <td>{seat.class_code}</td>
                  <td>{seat.train_code}</td>
                  <td>{stationName(seat.from_station)}</td>
                  <td>{stationName(seat.to_station)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
};

const ShowUser = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const { loginState, userId, logOut } = useData();
  const { id } = useParams();

  const [userData, setUserData] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ticketError, setTicketError] = useState('');
  const [tab, setTab] = useState('upcoming');

  // Password change
  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Account deletion
  const [delOpen, setDelOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [delError, setDelError] = useState('');

  // Ticket cancellation
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [refundAmount, setRefundAmount] = useState(0);

  const [logoutOpen, setLogoutOpen] = useState(false);

  const loadTickets = async () => {
    const res = await fetch(`${API_URL}/user/printTicket/${id}`);
    const json = await res.json();
    if (json.success) {
      setTicketData(json.data);
      setTicketError('');
    } else {
      setTicketData(null);
      setTicketError(json.error || t('No ticket history found'));
    }
  };

  useEffect(() => {
    // Wait for the stored session to load before deciding
    const storedId = localStorage.getItem('userId');
    if (!localStorage.getItem('token') || (storedId && storedId !== id)) {
      navigate('/');
      return;
    }
    if (!loginState || userId === null) return;
    if (userId.toString() !== id) {
      navigate('/');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const userResponse = await fetch(`${API_URL}/user/info/${id}`);
        const userRec = await userResponse.json();
        setUserData(userRec.data?.result || { first_name: '', last_name: '', phone_number: '' });
        await loadTickets();
      } catch (error) {
        setTicketError(t('Failed to fetch your account data.'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loginState, userId, navigate]);

  const grouped = (ticketData?.seat_reservations || []).reduce((acc, seat) => {
    (acc[seat.date] = acc[seat.date] || []).push(seat);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();
  const upcoming = dates.filter((d) => !grouped[d][0]?.time_remaining?.startsWith('-'));
  const past = dates.filter((d) => grouped[d][0]?.time_remaining?.startsWith('-')).reverse();
  const shown = tab === 'upcoming' ? upcoming : past;

  const closePw = () => {
    setPwOpen(false);
    setPwError('');
    setPwSuccess('');
    setPassword('');
    setNewPassword('');
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (!password) {
      setPwError(t('Please enter your current password to confirm the change.'));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/user/info/update/${userData.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, new_password: newPassword }),
      });
      if (res.status === 200) {
        setPwError('');
        setPwSuccess(t('Password updated successfully!'));
        setTimeout(closePw, 1500);
      } else {
        const err = await res.json();
        setPwError(err.error || t('Could not update password.'));
      }
    } catch (err) {
      setPwError(t('Network error. Please try again.'));
    }
  };

  const deleteAccount = async () => {
    if (!deletePassword) {
      setDelError(t('Please enter your password to delete the account.'));
      return;
    }
    try {
      const response = await fetch(`${API_URL}/user/info/delete/${userData.user_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (response.status === 200) {
        logOut();
      } else {
        const err = await response.json();
        setDelError(err.error || t('Could not delete account.'));
      }
    } catch (error) {
      setDelError(t('Network error. Please try again.'));
    }
  };

  const openCancel = (ticketId, date) => {
    if (!ticketId) return;
    setSelectedTicket({ ticketId, date });
    setCancelError('');
    setCancelOpen(true);
  };

  const cancelTicket = async () => {
    if (!selectedTicket) return;
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/booking/cancelTicket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ticket_id: selectedTicket.ticketId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setCancelError(err.error || err.message || t('Cancellation failed.'));
        return;
      }
      const result = await response.json();
      setRefundAmount(result.refund_amount);
      setCancelOpen(false);
      setRefundOpen(true);
      await loadTickets();
    } catch (err) {
      setCancelError(t('Error: {msg}', { msg: err.message }));
    } finally {
      setCancelling(false);
    }
  };

  const fullName = userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : '';

  return (
    <>
      <section className="band">
        <div className="container row-between">
          <div className="row" style={{ gap: 16 }}>
            <span className="avatar" aria-hidden="true">{initials(userData?.first_name, userData?.last_name)}</span>
            <div>
              <p className="eyebrow">{t('My account')}</p>
              <h1 style={{ fontSize: 30, marginTop: 4 }}>{loading ? t('Loading…') : fullName || t('Passenger')}</h1>
              {userData?.phone_number && <p className="small" style={{ marginTop: 2 }}>{phoneNumber(userData.phone_number)}</p>}
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn btn-white" onClick={() => setPwOpen(true)} disabled={!userData}>
              <Icon name="lock" size={18} /> {t('Change password')}
            </button>
            <button
              type="button"
              className="btn btn-on-band"
              onClick={() => setLogoutOpen(true)}
            >
              <Icon name="logout" size={18} /> {t('Log out')}
            </button>
          </div>
        </div>
      </section>

      <div className="container overlap section stack-lg">
        <section className="card card-pad stack" aria-labelledby="tickets-title">
          <div className="row-between">
            <h2 id="tickets-title" className="h3">{t('My tickets')}</h2>
            <Link to="/booking/train/search" className="btn btn-primary btn-sm">
              <Icon name="search" size={16} /> {t('Book a new trip')}
            </Link>
          </div>

          <div className="tabs" role="tablist" aria-label={t('Ticket filter')}>
            <button type="button" role="tab" className="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
              {t('Upcoming')}<span className="count">{num(upcoming.length)}</span>
            </button>
            <button type="button" role="tab" className="tab" aria-selected={tab === 'past'} onClick={() => setTab('past')}>
              {t('Past')}<span className="count">{num(past.length)}</span>
            </button>
          </div>

          {loading && <div className="stack">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}</div>}

          {!loading && shown.length === 0 && (
            <EmptyState
              icon="ticket"
              title={tab === 'upcoming' ? t('No upcoming trips') : t('No past trips yet')}
              action={tab === 'upcoming' && <Link to="/booking/train/search" className="btn btn-outline">{t('Find a train')}</Link>}
            >
              {ticketError && tab === 'upcoming' && !ticketData ? ticketError : t('Tickets you book will show up here.')}
            </EmptyState>
          )}

          {!loading && shown.map((date) => (
            <TicketGroup key={date} date={date} seats={grouped[date]} onCancel={openCancel} />
          ))}
        </section>

        <section className="card card-pad row-between" aria-labelledby="danger-title">
          <div className="stack-sm">
            <h2 id="danger-title" className="h3">{t('Delete account')}</h2>
            <p className="small muted">{t('Permanently removes your account. All your tickets will be cancelled.')}</p>
          </div>
          <button type="button" className="btn btn-danger-outline" onClick={() => { setDelError(''); setDelOpen(true); }} disabled={!userData}>
            <Icon name="trash" size={18} /> {t('Delete account')}
          </button>
        </section>
      </div>

      {/* Change password */}
      <Modal open={pwOpen} onClose={closePw} title={t('Change password')} icon="lock">
        <form onSubmit={updatePassword} className="stack">
          {pwError && <Alert tone="danger">{pwError}</Alert>}
          {pwSuccess && <Alert tone="success">{pwSuccess}</Alert>}
          <div className="field">
            <label htmlFor="new-pw">{t('New password')}</label>
            <input id="new-pw" type="password" className="input" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cur-pw">{t('Current password')}</label>
            <input id="cur-pw" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={closePw}>{t('Cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('Update password')}</button>
          </div>
        </form>
      </Modal>

      {/* Delete account */}
      <Modal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title={t('Delete your account?')}
        icon="trash"
        tone="danger"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDelOpen(false)}>{t('Keep account')}</button>
            <button type="button" className="btn btn-danger" onClick={deleteAccount}>{t('Delete account')}</button>
          </>
        }
      >
        <Alert tone="warn">{t('This can’t be undone. All your tickets will be cancelled.')}</Alert>
        {delError && <Alert tone="danger">{delError}</Alert>}
        <div className="field">
          <label htmlFor="del-pw">{t('Enter your password to confirm')}</label>
          <input id="del-pw" type="password" className="input" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
        </div>
      </Modal>

      {/* Cancel ticket */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('Cancel this ticket?')}
        icon="refund"
        tone="danger"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCancelOpen(false)}>{t('Keep ticket')}</button>
            <button type="button" className="btn btn-danger" onClick={cancelTicket} disabled={cancelling}>
              {cancelling ? <Spinner label={t('Cancelling…')} /> : t('Yes, cancel')}
            </button>
          </>
        }
      >
        <p>
          {t('You’re cancelling your trip on {date}. Your refund depends on how long before departure you cancel:', { date: selectedTicket ? formatDate(selectedTicket.date) : '' })}
        </p>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {REFUND_RULES.map(([when, what]) => (
                <tr key={when}><td>{t(when)}</td><td className="strong">{t(what)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {cancelError && <Alert tone="danger">{cancelError}</Alert>}
      </Modal>

      {/* Refund result */}
      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title={t('Ticket cancelled')}
        icon="check"
        footer={<button type="button" className="btn btn-primary" onClick={() => setRefundOpen(false)}>{t('Done')}</button>}
      >
        <div className="row-between card card-pad" style={{ background: 'var(--green-50)', borderColor: 'var(--green-100)' }}>
          <span className="strong">{t('Refund amount')}</span>
          <span className="price" style={{ fontSize: 24 }}>{taka(refundAmount || 0)}</span>
        </div>
        <p className="small muted">{t('The refund will reach your account within 3 working days.')}</p>
      </Modal>

      {/* Log out */}
      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title={t('Log out of Safar?')}
        icon="logout"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setLogoutOpen(false)}>{t('Stay signed in')}</button>
            <button type="button" className="btn btn-primary" onClick={() => { setLogoutOpen(false); logOut(); }}>{t('Log out')}</button>
          </>
        }
      >
        <p className="muted">{t('You’ll need to sign in again to book or manage tickets.')}</p>
      </Modal>
    </>
  );
};

export default ShowUser;
