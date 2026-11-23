import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { useT } from '../i18n';

// Shown for pages whose backend endpoints don't exist in the current API
// (admin, reviews, per-train route page, train list, user search).
const Unavailable = ({ title = 'This page isn’t available yet' }) => {
  const { t } = useT();
  return (
    <>
      <div className="band" style={{ paddingBottom: 88 }}>
        <div className="container">
          <h1>{t(title)}</h1>
        </div>
      </div>
      <div className="container container-sm overlap section">
        <div className="card card-pad">
          <EmptyState
            icon="plug"
            title={t('Not connected to the server')}
            action={
              <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
                <Link to="/booking/train/search" className="btn btn-primary">{t('Book a ticket')}</Link>
                <Link to="/" className="btn btn-ghost">{t('Go home')}</Link>
              </div>
            }
          >
            {t('This part of Safar used an older server that has been retired, and the current backend doesn’t provide it yet.')}
          </EmptyState>
        </div>
      </div>
    </>
  );
};

export default Unavailable;
