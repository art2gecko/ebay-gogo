import React from 'react';

export default function SellerInfo({ name, feedback, feedbackScore }) {
  const getColor = () => {
    if (!feedbackScore) return 'var(--text-muted)';
    if (feedbackScore >= 1000) return 'var(--success)';
    if (feedbackScore >= 100) return 'var(--accent)';
    if (feedbackScore >= 10) return 'var(--warning)';
    return 'var(--text-muted)';
  };

  return (
    <div className="seller-info">
      <div className="seller-name" style={{ color: getColor() }}>
        {name || 'Unknown'}
      </div>
      {feedback && (
        <div className="seller-feedback">{feedback}</div>
      )}
    </div>
  );
}
