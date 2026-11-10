import { X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SettingsModalProps {
  onClose: () => void
  currentTheme: string
  setTheme: (theme: string) => void
}

const themes = [
  { id: 'teal', name: 'Turquesa', color: 'bg-teal-600' },
  { id: 'indigo', name: 'Índigo', color: 'bg-indigo-600' },
  { id: 'emerald', name: 'Esmeralda', color: 'bg-emerald-600' },
  { id: 'rose', name: 'Rosa', color: 'bg-rose-600' },
  { id: 'amber', name: 'Ámbar', color: 'bg-amber-500' }
]

export function SettingsModal({ onClose, currentTheme, setTheme }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Configuraciones</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Tema de la Aplicación</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${currentTheme === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className={`w-6 h-6 rounded-full shadow-sm flex items-center justify-center ${t.color}`}>
                    {currentTheme === t.id && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <span className={`text-sm font-medium ${currentTheme === t.id ? 'text-brand-900' : 'text-slate-600'}`}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
