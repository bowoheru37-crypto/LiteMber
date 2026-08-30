import React from 'react';
import { X } from 'lucide-react';

interface UnifiedModalProps {
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}

export const UnifiedModal: React.FC<UnifiedModalProps> = ({
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-cyan-400',
  badge,
  children,
  footer,
  headerAction,
  maxWidth = '2xl',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all animate-in fade-in duration-200">
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl w-full ${maxWidthClasses} max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-white`}
      >
        {/* Mobile Drag / Touch Bar */}
        <div className="sm:hidden w-full pt-3 pb-1 flex justify-center shrink-0 min-h-[24px]">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800 shrink-0 min-h-[60px] bg-slate-900/95">
          <div className="flex items-center gap-3 pr-2 min-w-0">
            {Icon && (
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 shrink-0">
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-white truncate">{title}</h3>
                {badge && <div className="shrink-0">{badge}</div>}
              </div>
              {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 min-h-[48px] min-w-[48px]"
              aria-label="Tutup Modal"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/70 shrink-0 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
