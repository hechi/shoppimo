import React from 'react';
import { useI18n } from '../context/I18nContext';

interface ExpirationIndicatorProps {
  expiresAt?: string;
}

const ExpirationIndicator: React.FC<ExpirationIndicatorProps> = ({ expiresAt }) => {
  const { t } = useI18n();

  if (!expiresAt) {
    return null;
  }

  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Don't show if more than 7 days away
  if (daysUntilExpiration > 7) {
    return null;
  }

  const getIndicatorStyle = () => {
    if (daysUntilExpiration <= 1) {
      return 'bg-red-50 border-red-200 text-red-800';
    } else if (daysUntilExpiration <= 3) {
      return 'bg-orange-50 border-orange-200 text-orange-800';
    } else {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getIcon = () => {
    if (daysUntilExpiration <= 1) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const getMessage = () => {
    if (daysUntilExpiration <= 0) {
      return t('messages.listExpiredToday');
    } else if (daysUntilExpiration === 1) {
      return t('messages.listExpiresTomorrow');
    } else {
      return t('messages.listExpiresInDays', { days: daysUntilExpiration });
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${getIndicatorStyle()}`}>
      {getIcon()}
      <span>{getMessage()}</span>
    </div>
  );
};

export default ExpirationIndicator;