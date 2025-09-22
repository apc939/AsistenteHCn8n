export interface NoteType {
  id: string;
  label: string;
}

export interface NotesConfig {
  types: NoteType[];
}

const STORAGE_KEY = 'notes-config';

const DEFAULT_TYPES: NoteType[] = [
  { id: 'analysis', label: 'Análisis' },
  { id: 'physical_exam', label: 'Examen Físico' },
  { id: 'diagnosis', label: 'Diagnóstico' },
  { id: 'plan', label: 'Plan de Tratamiento' }
];

const sanitizeLabel = (label: string): string => label.trim();

const createTypeId = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || `note_${Date.now()}`;

class NotesService {
  private config: NotesConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): NotesConfig {
    if (typeof window === 'undefined') {
      return { types: [...DEFAULT_TYPES] };
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as NotesConfig;
        if (Array.isArray(parsed.types) && parsed.types.length > 0) {
          return {
            types: parsed.types.map((type) => ({
              id: type.id,
              label: sanitizeLabel(type.label)
            }))
          };
        }
      } catch (error) {
        // Ignore and fall back to defaults
      }
    }

    return { types: [...DEFAULT_TYPES] };
  }

  private persist(): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
  }

  public getConfig(): NotesConfig {
    return {
      types: [...this.config.types]
    };
  }

  public addType(label: string): NotesConfig {
    const sanitized = sanitizeLabel(label);
    if (!sanitized) {
      throw new Error('El nombre del tipo de nota no puede estar vacío');
    }

    const exists = this.config.types.some(
      (type) => type.label.toLowerCase() === sanitized.toLowerCase()
    );

    if (exists) {
      throw new Error('Ya existe un tipo de nota con ese nombre');
    }

    const newType: NoteType = {
      id: createTypeId(sanitized),
      label: sanitized
    };

    this.config = {
      types: [...this.config.types, newType]
    };

    this.persist();
    return this.getConfig();
  }

  public updateType(id: string, label: string): NotesConfig {
    const sanitized = sanitizeLabel(label);
    if (!sanitized) {
      throw new Error('El nombre del tipo de nota no puede estar vacío');
    }

    const exists = this.config.types.some(
      (type) => type.id !== id && type.label.toLowerCase() === sanitized.toLowerCase()
    );

    if (exists) {
      throw new Error('Ya existe un tipo de nota con ese nombre');
    }

    this.config = {
      types: this.config.types.map((type) =>
        type.id === id ? { ...type, label: sanitized } : type
      )
    };

    this.persist();
    return this.getConfig();
  }

  public removeType(id: string): NotesConfig {
    if (this.config.types.length <= 1) {
      throw new Error('Debe existir al menos un tipo de nota');
    }

    this.config = {
      types: this.config.types.filter((type) => type.id !== id)
    };

    this.persist();
    return this.getConfig();
  }

  public resetToDefaults(): NotesConfig {
    this.config = { types: [...DEFAULT_TYPES] };
    this.persist();
    return this.getConfig();
  }
}

export const notesService = new NotesService();
