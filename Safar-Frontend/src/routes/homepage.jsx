import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import { Icon } from '../components/ui';
import { useT } from '../i18n';
import { num } from '../lib/format';

const FEATURES = [
  { icon: 'seat', title: 'Pick your exact seat', text: 'See the coach layout, which seats are free, and choose up to 4 seats together.' },
  { icon: 'wallet', title: 'Pay with bKash or Nagad', text: 'Your seats are held for 5 minutes while you complete payment.' },
  { icon: 'refund', title: 'Cancel online', text: 'Cancel from your account up to 6 hours before departure and get a refund.' },
];

const Homepage = () => {
  const navigate = useNavigate();
  const { t } = useT();

  const handleSearch = ({ from, to, date }) => {
    const params = new URLSearchParams({ from, to, date });
    navigate(`/booking/train/search?${params.toString()}`);
  };

  return (
    <>
      <section className="band band-tall">
        <div className="container">
          <p className="eyebrow" style={{ marginBottom: 12 }}>{t('Train tickets · Bangladesh')}</p>
          <h1 className="hero-title">{t('Book a train seat in under a minute.')}</h1>
          <p className="lead" style={{ color: '#D7EEE4', marginTop: 12, maxWidth: 560 }}>
            {t('Safar khoobsurat hain manzil se bhi! Find your train, choose your seat and travel.')}
          </p>
          <div className="stat-strip" aria-label={t('Network size')}>
            <div><strong>{num(46)}</strong><span>{t('stations')}</span></div>
            <div><strong>{num(89)}</strong><span>{t('trains')}</span></div>
            <div><strong>{num(10)}</strong><span>{t('days of advance booking')}</span></div>
          </div>
        </div>
      </section>

      <div className="container overlap">
        <SearchForm onSubmit={handleSearch} />
      </div>

      <section className="section container stack-lg" aria-labelledby="how-title">
        <div className="stack-sm">
          <p className="eyebrow">{t('How it works')}</p>
          <h2 id="how-title" className="h2">{t('Three steps to your ticket')}</h2>
        </div>
        <ol className="steps">
          <li><div><strong>{t('Search')}</strong><p className="muted small">{t('Choose stations and a date within the next 10 days.')}</p></div></li>
          <li><div><strong>{t('Choose seats')}</strong><p className="muted small">{t('Pick a class and tap free seats on the coach map.')}</p></div></li>
          <li><div><strong>{t('Pay')}</strong><p className="muted small">{t('Confirm with bKash or Nagad before the timer runs out.')}</p></div></li>
        </ol>

        <div className="grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-pad feature">
              <span className="feature-icon"><Icon name={f.icon} size={22} /></span>
              <h3 className="h3">{t(f.title)}</h3>
              <p className="muted small">{t(f.text)}</p>
            </div>
          ))}
        </div>

        <div className="card card-pad row-between">
          <div className="stack-sm">
            <h3 className="h3">{t('Looking for a train’s timetable?')}</h3>
            <p className="muted small">{t('See every stop, arrival and departure for both directions.')}</p>
          </div>
          <Link to="/trains" className="btn btn-outline">
            <Icon name="route" size={18} /> {t('View timetables')}
          </Link>
        </div>
      </section>
    </>
  );
};

export default Homepage;
