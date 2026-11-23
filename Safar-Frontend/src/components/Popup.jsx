import React from 'react';
import { Modal } from './ui';
import { useT } from '../i18n';

// Same API as before ({ message, onClose }), rendered with the shared Modal.
const Popup = ({ message, onClose, title }) => {
  const { t } = useT();
  return (
    <Modal
      open
      onClose={onClose}
      title={title || t('Notice')}
      icon="info"
      footer={<button type="button" className="btn btn-primary" onClick={onClose}>{t('OK')}</button>}
    >
      <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
    </Modal>
  );
};

export default Popup;
