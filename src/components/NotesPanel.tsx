import { ChangeEvent } from 'react';
import { Notebook, Plus, Trash2 } from 'lucide-react';
import { NoteType } from '../services/notesService';
import { NoteWithType } from '../hooks/useNotes';
import { StatusMessage } from './StatusMessage';

interface NotesPanelProps {
  notes: NoteWithType[];
  noteTypes: NoteType[];
  error?: string | null;
  onAddNote: () => void;
  onUpdateNoteContent: (id: string, content: string) => void;
  onUpdateNoteType: (id: string, typeId: string) => void;
  onRemoveNote: (id: string) => void;
}

export const NotesPanel = ({
  notes,
  noteTypes,
  error,
  onAddNote,
  onUpdateNoteContent,
  onUpdateNoteType,
  onRemoveNote
}: NotesPanelProps) => {
  const handleContentChange = (id: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNoteContent(id, event.target.value);
  };

  const handleTypeChange = (id: string) => (event: ChangeEvent<HTMLSelectElement>) => {
    onUpdateNoteType(id, event.target.value);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Notebook className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Notas Clínicas</h3>
            <p className="text-sm text-gray-500">
              Registra hallazgos y observaciones durante la consulta.
              <br />
              Nunca datos personales.
            </p>
          </div>
        </div>
        <button
          onClick={onAddNote}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva nota</span>
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <StatusMessage message={error} type="error" />
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No hay notas registradas todavía.</p>
          <p className="text-xs mt-1">Haz clic en "Nueva nota" para comenzar a escribir.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {notes.map((note, index) => (
            <div key={note.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <label htmlFor={`note-type-${note.id}`} className="text-xs uppercase tracking-wide text-gray-500">
                      Tipo de nota
                    </label>
                    <select
                      id={`note-type-${note.id}`}
                      value={note.type.id}
                      onChange={handleTypeChange(note.id)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {noteTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveNote(note.id)}
                  className="text-sm text-gray-500 hover:text-red-600 inline-flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              </div>

              <div>
                <label htmlFor={`note-content-${note.id}`} className="sr-only">
                  Contenido de la nota
                </label>
                <textarea
                  id={`note-content-${note.id}`}
                  value={note.content}
                  onChange={handleContentChange(note.id)}
                  placeholder="Escribe aquí tus observaciones clínicas..."
                  className="w-full min-h-[120px] resize-y rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="mt-2 text-xs text-gray-400 text-right">
                Última actualización: {new Date(note.updatedAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
