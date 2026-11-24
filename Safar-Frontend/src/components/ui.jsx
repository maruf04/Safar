import React, { useEffect, useRef } from 'react';
import { useT } from '../i18n';

/* Simple stroke icons, all 24×24, inheriting currentColor. */
const PATHS = {
  train: <><rect x="5" y="3" width="14" height="13" rx="3" /><path d="M5 10h14M9 20l-2 2M15 20l2 2M8 16l-1 4M16 16l1 4" /><circle cx="9" cy="13" r=".5" /><circle cx="15" cy="13" r=".5" /></>,
  swap: <path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3" />,
  swapH: <path d="M4 7h16M17 4l3 3-3 3M20 17H4M7 14l-3 3 3 3" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  check: <path d="M5 13l4 4L19 7" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5V8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  seat: <><path d="M7 4h7a2 2 0 0 1 2 2v7H7z" /><path d="M5 13h13l1 4H5zM7 17v3M17 17v3" /></>,
  ticket: <><path d="M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4z" /><path d="M14 5v14" strokeDasharray="2 2" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h2M3 9h18" /></>,
  refund: <><path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.5" /><path d="M4 4v4.5h4.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  route: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" /></>,
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />,
  plug: <><path d="M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0zM12 17v4" /></>,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
};

export const Icon = ({ name, size = 20, strokeWidth = 2, className, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    aria-label={title}
  >
    {PATHS[name]}
  </svg>
);

export const Spinner = ({ label }) => (
  <span className="row" style={{ gap: 8 }} role="status">
    <span className="spinner" aria-hidden="true" />
    {label && <span>{label}</span>}
  </span>
);

export const Alert = ({ tone = 'info', children }) => {
  const icon = tone === 'success' ? 'check' : tone === 'info' ? 'info' : 'alert';
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
};

export const EmptyState = ({ icon = 'search', title, children, action }) => (
  <div className="empty">
    <span className="empty-icon"><Icon name={icon} size={26} /></span>
    <h3 className="h3">{title}</h3>
    {children && <p className="muted" style={{ maxWidth: 420 }}>{children}</p>}
    {action}
  </div>
);

/* Accessible modal: closes on Escape and overlay click, focuses itself on open. */
export const Modal = ({ open, onClose, title, icon, tone, children, footer, size }) => {
  const ref = useRef(null);
  const { t } = useT();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (ref.current) ref.current.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        ref={ref}
        style={size === 'xl' ? { maxWidth: 1040 } : size === 'lg' ? { maxWidth: 600 } : undefined}
      >
        <div className="modal-head">
          <div className="stack-sm">
            {icon && <span className={`modal-icon ${tone === 'danger' ? 'danger' : ''}`}><Icon name={icon} size={24} /></span>}
            {title && <h2 className="h3" style={{ fontSize: 20 }}>{title}</h2>}
          </div>
          {onClose && (
            <button type="button" className="modal-close" onClick={onClose} aria-label={t('Close')}>
              <Icon name="close" />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};
