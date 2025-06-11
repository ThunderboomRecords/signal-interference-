export type NoteEvent = { note: number; deltaTime: number; duration: number };

export interface ApplicationSettings {
  clockInput?: string;
  midiInput?: string;
  midiOutput?: string;
}
export interface MidiInterfaceInfo {
  index: number;
  name: string;
}


export interface TrainingData {
  name: string; // original file name
  notes: NoteEvent[];
}

export interface GenerationStemData {
  name: string; // original file name
  notes: NoteEvent[];
}
export interface NoteHistory {
  input: NoteEvent[];
  output: NoteEvent[];
  timestamp: Date;
}
export interface Song {
  name: string;
  trainingData: TrainingData[];
  stemData: GenerationStemData[];
  beatsPerBar: number;
  history?: NoteHistory[];
  midiSelection?: {
    cc: number;
    value: number;
  }
}

export interface Project {
  songs: Song[];
  lastSavePath?: string;
}
