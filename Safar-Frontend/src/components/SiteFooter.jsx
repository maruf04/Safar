import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { num } from '../lib/format';

const SiteFooter = () => {
  const { t } = useT();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack-sm">
            <span className="brand" style={{ fontSize: 22 }}>
              <img src={`${process.env.PUBLIC_URL}/safar-mark-light.svg`} alt="" width="32" height="32" />
              safar<span className="brand-dot">.</span>
            </span>
            <p className="small" style={{ maxWidth: 280 }}>
              {t('Search trains, pick your seat and pay with bKash or Nagad, all in one place.')}
            </p>
          </div>
          <div>
            <h4>{t('Travel')}</h4>
            <ul>
              <li><Link to="/booking/train/search">{t('Book tickets')}</Link></li>
              <li><Link to="/trains">{t('Train timetable')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('Account')}</h4>
            <ul>
              <li><Link to="/users/login">{t('Sign in')}</Link></li>
              <li><Link to="/users">{t('Create account')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('Help')}</h4>
            <ul>
              <li><Link to="/about">{t('About Safar')}</Link></li>
              <li><Link to="/about#refunds">{t('Refund policy')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom row-between">
          <span>© {num(new Date().getFullYear())} Safar</span>
          <span>{t('A database project · CSE, BUET')}</span>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
