import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const NotificationToast = ({ notification, safeString, onClose, onAction }) => {
  if (!notification.show) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] animate-in slide-in-from-top-full duration-500 max-w-md w-full px-4">
      <div className={`
        flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border bg-white
        ${notification.type === 'success' ? 'border-green-100 shadow-green-500/10' :
          notification.type === 'info' ? 'border-indigo-100 shadow-indigo-500/10' :
            'border-red-100 shadow-red-500/10'}
      `}>
        <div className={`p-2.5 rounded-xl ${notification.type === 'success' ? 'bg-green-50 text-green-600' :
          notification.type === 'info' ? 'bg-indigo-50 text-indigo-600' :
            'bg-red-50 text-red-600'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
            notification.type === 'info' ? <Info className="w-5 h-5" /> :
              <AlertCircle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black text-gray-900 tracking-tight leading-tight">{safeString(notification.message)}</p>
          {notification.description && (
            <p className="text-[11px] font-medium text-gray-500 mt-1 leading-snug">{safeString(notification.description)}</p>
          )}
        </div>
        {notification.actionButton && (
          <button
            onClick={onAction}
            className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all ${notification.type === 'error'
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
              }`}
          >
            {notification.actionButton.label}
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
