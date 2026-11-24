import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './ui';
import { useT } from '../i18n';
import { num } from '../lib/format';

const REFUND_RULES = [
  ['More than 48 hours before departure', '10% deduction (minimum BDT 40)'],
  ['24–48 hours before departure', '25% deduction (minimum BDT 40)'],
  ['12–24 hours before departure', '50% deduction (minimum BDT 40)'],
  ['6–12 hours before departure', '75% deduction (minimum BDT 40)'],
  ['Less than 6 hours before departure', 'No refund'],
];

const About = () => {
  const location = useLocation();
  const { t } = useT();

  // Support /about#refunds links
  useEffect(() => {
    if (location.hash === '#refunds') {
      const el = document.getElementById('refunds');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <>
      <section className="band band-photo" style={{ '--band-img': `url(${process.env.PUBLIC_URL}/images/steam-locomotive.jpg)` }}>
        <div className="container">
          <p className="eyebrow">{t('About')}</p>
          <h1 style={{ marginTop: 6, maxWidth: 640 }}>{t('Every journey is part of the story.')}</h1>
        </div>
      </section>

      <div className="container overlap section stack-lg">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="grid-2" style={{ gap: 0 }}>
            <img
              src={`${process.env.PUBLIC_URL}/kamalapur.png`}
              alt={t('A green Shovan Chair coach at a station platform, with a railway staff member at the door')}
              style={{ width: '100%', height: '100%', minHeight: 260, objectFit: 'cover' }}
            />
            <div className="card-pad stack">
              <h2 className="h2">{t('Our journey')}</h2>
              <p className="muted">
                {t('Traveling by train offers a unique and immersive experience, allowing you to journey through diverse landscapes and cultures. From bustling cities to picturesque countryside, trains offer a window into the heart of every destination.')}
              </p>
              <p className="muted">
                {t('Discover the joy of slow travel, where the journey itself becomes an adventure. Whether it’s the rhythmic clacking of wheels on the tracks or the panoramic views unfolding outside your window, every moment on a train is filled with anticipation and discovery.')}
              </p>
              <div className="row">
                <Link to="/booking/train/search" className="btn btn-primary">{t('Book a ticket')}</Link>
                <a
                  href="https://www.youtube.com/watch?v=_BXmqEwgEk8&list=RDa_XQdhxeZ10&index=2"
                  className="btn btn-ghost"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Watch video')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card card-pad feature">
            <span className="feature-icon"><Icon name="map" size={22} /></span>
            <h2 className="h3">{t('Our mission')}</h2>
            <p className="muted small">
              {t('We are dedicated to creating extraordinary rail travel experiences that connect people with the beauty of the world, one journey at a time. Through sustainable travel and authentic connections, we make every mile meaningful.')}
            </p>
          </div>
          <div className="card card-pad feature">
            <span className="feature-icon"><Icon name="info" size={22} /></span>
            <h2 className="h3">{t('Contact us')}</h2>
            <p className="muted small">{t('For refunds of unsuccessful purchases and card charging issues:')}</p>
            <dl className="kv" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><dt>{t('Customer support')}</dt><dd>{num(103104)}</dd></div>
              <div><dt>{t('Email')}</dt><dd style={{ wordBreak: 'break-all' }}>support@sami&amp;maruf.buet.ac.bd</dd></div>
            </dl>
          </div>
        </div>

        <section id="refunds" className="card card-pad stack" aria-labelledby="refund-title" style={{ scrollMarginTop: 80 }}>
          <div className="row" style={{ gap: 12 }}>
            <span className="feature-icon"><Icon name="refund" size={22} /></span>
            <h2 id="refund-title" className="h2">{t('Refund policy')}</h2>
          </div>

          <div className="grid-2">
            <div className="stack-sm">
              <h3 className="h3">{t('How to get an online refund')}</h3>
              <ol className="muted" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
                <li>{t('Sign in to your account')}</li>
                <li>{t('Open My account → My tickets')}</li>
                <li>{t('Find your ticket and choose Cancel ticket')}</li>
              </ol>
              <p className="small muted" style={{ marginTop: 8 }}>
                {t('Note: If your ticket was printed at the counter before the journey date, it isn’t eligible for an online refund. Please visit the station counter instead.')}
              </p>
            </div>
            <div className="stack-sm">
              <h3 className="h3">{t('Important notes')}</h3>
              <ul className="muted" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
                <li>{t('Service charges for online purchases are non-refundable')}</li>
                <li>{t('Advance tickets for special occasions are non-refundable')}</li>
                <li>{t('Refunds may take 3–5 business days to process')}</li>
              </ul>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('When you cancel')}</th><th>{t('Refund deduction')}</th></tr></thead>
              <tbody>
                {REFUND_RULES.map(([when, what]) => (
                  <tr key={when}><td>{t(when)}</td><td className="strong">{t(what)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;
