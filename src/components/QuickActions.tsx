import React from 'react';
import { 
  RefreshCcw, 
  Trash2, 
  Copy, 
  Lock, 
  Unlock, 
  Printer, 
  Share2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onUnassignAll: () => void;
  onAutoFill: () => void;
  onDuplicateYesterday: () => void;
  onPrint: () => void;
  className?: string;
}

export function QuickActions({ 
  onUnassignAll, 
  onAutoFill, 
  onDuplicateYesterday, 
  onPrint,
  className 
}: QuickActionsProps) {
  return (
    <div className={cn("bg-white p-4 rounded-3xl calm-shadow border border-slate-100 flex flex-wrap gap-2", className)}>
      <button 
        onClick={onAutoFill}
        className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl font-bold text-sm hover:bg-primary-100 transition-colors"
      >
        <Zap className="w-4 h-4" />
        Auto-Fill Slots
      </button>

      <button 
        onClick={onDuplicateYesterday}
        className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
      >
        <Copy className="w-4 h-4" />
        Copy Yesterday
      </button>

      <button 
        onClick={onUnassignAll}
        className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Clear Board
      </button>

      <div className="h-8 w-[1px] bg-slate-100 mx-2 hidden md:block" />

      <button 
        onClick={onPrint}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print PDF
      </button>

      <button 
        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>
    </div>
  );
}
