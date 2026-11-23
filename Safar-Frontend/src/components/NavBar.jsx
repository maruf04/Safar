import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useData } from './AppContext';
import { useT } from '../i18n';
import { Icon } from './ui';

export const LangToggle = () => {
  const { lang, toggleLang } = useT();
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={toggleLang}
      aria-label={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
      title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
    >
      <span className={lang === 'en' ? 'on' : ''} lang="en">EN</span>
      <span className={lang === 'bn' ? 'on' : ''} lang="bn">বাং</span>
    </button>
  );
};

const NavBar = () => {
  const { loginState, userId } = useData();
  const { t } = useT();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label={t('Safar home')}>
          <img src={`${process.env.PUBLIC_URL}/safar-mark-light.svg`} alt="" className="brand-mark" width="40" height="40" />
          <span className="brand-word">SAFAR<span className="brand-dot">.</span></span>
        </Link>

        <div className="nav-right">
          <nav aria-label={t('Main')}>
            <ul id="main-menu" className={`nav-links${open ? ' open' : ''}`}>
              <li><NavLink to="/booking/train/search" className={linkClass}>{t('Book tickets')}</NavLink></li>
              <li><NavLink to="/trains" className={linkClass}>{t('Timetable')}</NavLink></li>
              <li><NavLink to="/about" className={linkClass}>{t('About')}</NavLink></li>
              {loginState ? (
                <li>
                  <NavLink to={`/users/${userId}`} className={linkClass}>
                    <Icon name="user" size={18} /> {t('My account')}
                  </NavLink>
                </li>
              ) : (
                <li><Link to="/users/login" className="nav-link nav-cta">{t('Sign in')}</Link></li>
              )}
            </ul>
          </nav>

          <LangToggle />

          <button
            type="button"
            className="nav-toggle"
            aria-label={open ? t('Close menu') : t('Open menu')}
            aria-expanded={open}
            aria-controls="main-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
