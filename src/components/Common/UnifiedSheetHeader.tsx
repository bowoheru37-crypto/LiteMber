import React from 'react';
import { X } from 'lucide-react';

interface UnifiedSheetHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  onClose: () => void;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export const UnifiedSheetHeader: React.FC<UnifiedSheetHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-cyan-400',
  onClose,
  action,
  badge,
}) => {
  return (
    <div className="flex items-center justify-between px-3.5 sm:px-4 py-3 border-b border-slate-800/80 bg-slate-900/95 shrink-0 min-h-[56px] text-white">
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 shrink-0">
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-white truncate leading-snug">{title}</h3>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && <p className="text-[10.5px] text-slate-400 truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 min-h-[48px] min-w-[48px]"
          aria-label="Tutup Panel"
          title="Tutup Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
