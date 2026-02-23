import React, { useEffect } from 'react';

export default function AlertBanner({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="alert-banner">
      <span>{message}</span>
      <button className="dismiss" onClick={onDismiss}>
        &times;
      </button>
    </div>
  );
}
