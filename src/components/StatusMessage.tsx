import React from 'react';
import { AlertCircle, CheckCircle, Loader, Wifi } from 'lucide-react';

interface StatusMessageProps {
  type: 'error' | 'success' | 'loading' | 'info';
  message: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ type, message }) => {
  const getConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: <AlertCircle size={20} />,
          className: 'bg-red-50 border-red-200 text-red-700',
          iconClassName: 'text-red-500',
        };
      case 'success':
        return {
          icon: <CheckCircle size={20} />,
          className: 'bg-green-50 border-green-200 text-green-700',
          iconClassName: 'text-green-500',
        };
      case 'loading':
        return {
          icon: <Loader size={20} className="animate-spin" />,
          className: 'bg-blue-50 border-blue-200 text-blue-700',
          iconClassName: 'text-blue-500',
        };
      case 'info':
        return {
          icon: <Wifi size={20} />,
          className: 'bg-gray-50 border-gray-200 text-gray-700',
          iconClassName: 'text-gray-500',
        };
    }
  };

  const config = getConfig();

  return (
    <div className={`
      border rounded-lg p-4 flex items-center space-x-3
      transition-all duration-300 transform
      ${config.className}
    `}>
      <div className={config.iconClassName}>
        {config.icon}
      </div>
      <p className="font-medium">{message}</p>
    </div>
  );
};