import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, PlusCircle, RotateCcw, Trash2 } from 'lucide-react';
import { NoteType } from '../services/notesService';
import { StatusMessage } from './StatusMessage';

interface NotesSettingsProps {
  noteTypes: NoteType[];
  error?: string | null;
  onAddType: (label: string) => boolean;
  onUpdateType: (id: string, label: string) => boolean;
  onRemoveType: (id: string) => boolean;
  onResetTypes: () => void;
}

export const NotesSettings = ({
  noteTypes,
  error,
  onAddType,
  onUpdateType,
  onRemoveType,
  onResetTypes
}: NotesSettingsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [localMessages, setLocalMessages] = useState<string | null>(null);

  const handleAddType = () => {
    if (!newTypeLabel.trim()) {
      setLocalMessages('Ingresa el nombre del tipo de nota');
      return;
    }

    const success = onAddType(newTypeLabel);
    if (success) {
      setNewTypeLabel('');
      setLocalMessages('Tipo de nota agregado');
      setTimeout(() => setLocalMessages(null), 2000);
    }
  };

  const handleUpdateType = (id: string, label: string) => {
    onUpdateType(id, label);
  };

  const handleRemoveType = (id: string) => {
    onRemoveType(id);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Tipos de notas clínicas</h3>
              <p className="text-sm text-gray-600">Configura las secciones que usas para tus registros</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${noteTypes.length > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50">
          <div className="mt-6 space-y-6">
            {error && (
              <StatusMessage message={error} type="error" />
            )}

            {localMessages && !error && (
              <StatusMessage message={localMessages} type="success" />
            )}

            <div className="space-y-4">
              {noteTypes.map((type, index) => (
                <div key={type.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label htmlFor={`note-type-label-${type.id}`} className="text-xs uppercase text-gray-500 tracking-wide">
                        Tipo {index + 1}
                      </label>
                      <input
                        id={`note-type-label-${type.id}`}
                        type="text"
                        value={type.label}
                        onChange={(event) => handleUpdateType(type.id, event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveType(type.id)}
                      disabled={noteTypes.length <= 1}
                      className="ml-3 inline-flex items-center space-x-2 text-sm text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-dashed border-teal-300 p-4">
              <label htmlFor="new-note-type" className="text-xs uppercase text-gray-500 tracking-wide">
                Nuevo tipo de nota
              </label>
              <div className="mt-2 flex space-x-3">
                <input
                  id="new-note-type"
                  type="text"
                  value={newTypeLabel}
                  onChange={(event) => setNewTypeLabel(event.target.value)}
                  placeholder="Ejemplo: Plan de seguimiento"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <button
                  onClick={handleAddType}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-2">Consejos de uso</p>
              <ul className="space-y-1">
                <li>• Mantén los nombres cortos y descriptivos</li>
                <li>• Puedes reordenar escribiendo números al inicio ("1. Inicio")</li>
                <li>• Usa "Restablecer" para volver a la configuración recomendada</li>
              </ul>
              <button
                onClick={onResetTypes}
                className="mt-3 inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restablecer tipos recomendados</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
