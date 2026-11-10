import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
}

export function Modal({ isOpen, onClose, title, message, type = 'info' }: ModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    error: {
      icon: <AlertCircle className="h-6 w-6 text-red-500" />,
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
    warning: {
      icon: <AlertCircle className="h-6 w-6 text-yellow-500" />,
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
    },
    info: {
      icon: <AlertCircle className="h-6 w-6 text-blue-500" />,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bg}`}>
              {config.icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-500 rounded-full hover:bg-slate-100" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">
          <p className="text-slate-600">{message}</p>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <Button onClick={onClose} className="px-6 rounded-xl">
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
