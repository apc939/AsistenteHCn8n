import React from 'react';

interface StatusMessageProps {
  message: string | null;
  type: 'info' | 'success' | 'error' | 'warning';
  onClose?: () => void;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message, type, onClose }) => {
  if (!message) return null;

  const getStatusStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info':
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`border px-4 py-3 rounded relative ${getStatusStyles()}`} role="alert">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">{getIcon()}</span>
          <span className="block sm:inline">{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-lg font-semibold hover:opacity-75"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};