import { useCallback, useMemo, useState } from 'react';
import { notesService, NoteType, NotesConfig } from '../services/notesService';

export interface NoteEntry {
  id: string;
  typeId: string;
  content: string;
  updatedAt: number;
}

export interface NoteWithType extends NoteEntry {
  type: NoteType;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [config, setConfig] = useState<NotesConfig>(notesService.getConfig());
  const [error, setError] = useState<string | null>(null);

  const getTypeById = useCallback(
    (typeId: string): NoteType | undefined =>
      config.types.find((type) => type.id === typeId),
    [config.types]
  );

  const getDefaultType = useCallback((): NoteType => config.types[0], [config.types]);

  const addNote = useCallback(
    (typeId?: string) => {
      const referenceType = (typeId && getTypeById(typeId)) || getDefaultType();
      const newNote: NoteEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        typeId: referenceType.id,
        content: '',
        updatedAt: Date.now()
      };

      setNotes((prev) => [...prev, newNote]);
      setError(null);
    },
    [getDefaultType, getTypeById]
  );

  const updateNoteContent = useCallback((id: string, content: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, content, updatedAt: Date.now() } : note
      )
    );
  }, []);

  const updateNoteType = useCallback(
    (id: string, typeId: string) => {
      const typeExists = getTypeById(typeId);
      if (!typeExists) {
        setError('Tipo de nota no válido');
        return;
      }

      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, typeId, updatedAt: Date.now() } : note
        )
      );
      setError(null);
    },
    [getTypeById]
  );

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const clearNotes = useCallback(() => {
    setNotes([]);
  }, []);

  const handleConfigUpdate = useCallback((updated: NotesConfig) => {
    setConfig(updated);
  }, []);

  const addNoteType = useCallback(
    (label: string) => {
      try {
        const updated = notesService.addType(label);
        handleConfigUpdate(updated);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo agregar el tipo de nota');
        return false;
      }
    },
    [handleConfigUpdate]
  );

  const updateNoteTypeLabel = useCallback(
    (id: string, label: string) => {
      try {
        const updated = notesService.updateType(id, label);
        handleConfigUpdate(updated);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el tipo de nota');
        return false;
      }
    },
    [handleConfigUpdate]
  );

  const removeNoteType = useCallback(
    (id: string) => {
      try {
        const updated = notesService.removeType(id);
        handleConfigUpdate(updated);
        setNotes((prev) =>
          prev.map((note) => ({
            ...note,
            typeId: updated.types.find((type) => type.id === note.typeId)?.id || updated.types[0].id
          }))
        );
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar el tipo de nota');
        return false;
      }
    },
    [handleConfigUpdate]
  );

  const resetNoteTypes = useCallback(() => {
    const updated = notesService.resetToDefaults();
    handleConfigUpdate(updated);
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        typeId: updated.types.find((type) => type.id === note.typeId)?.id || updated.types[0].id
      }))
    );
    setError(null);
  }, [handleConfigUpdate]);

  const notesWithTypes = useMemo<NoteWithType[]>(
    () =>
      notes.map((note) => {
        const type = getTypeById(note.typeId) || getDefaultType();
        return {
          ...note,
          type,
        };
      }),
    [notes, getTypeById, getDefaultType]
  );

  const getNotesForSubmission = useCallback(
    () =>
      notesWithTypes
        .filter((note) => note.content.trim().length > 0)
        .map((note) => ({
          id: note.id,
          type_id: note.type.id,
          type_label: note.type.label,
          content: note.content.trim(),
          updated_at: new Date(note.updatedAt).toISOString()
        })),
    [notesWithTypes]
  );

  return {
    notes: notesWithTypes,
    rawNotes: notes,
    noteTypes: config.types,
    error,
    addNote,
    updateNoteContent,
    updateNoteType,
    removeNote,
    clearNotes,
    addNoteType,
    updateNoteTypeLabel,
    removeNoteType,
    resetNoteTypes,
    getNotesForSubmission
  };
};
