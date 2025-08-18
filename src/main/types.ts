import { MarkovModelData } from "./markov/model";

export type NoteSecondTiming = {
  deltaTime: number;
  duration: number;
}
export type NoteEvent = { note: number; deltaTime: number; duration: number };

export interface ApplicationSettings {
  dawInput?: string;
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
  notes: NoteEvent[];
  timestamp: Date;
}
export interface History {
  input: NoteHistory;
  output: NoteHistory[];
}
export interface GenerationOptions {
  order: number;
  barsToGenerate: number; // bar length
}
export interface Song {
  name: string;
  id: string;
  trainingData: TrainingData[];
  stemData: GenerationStemData[];
  beatsPerBar: number;
  // stores recorded notes and the notes that are generated from it.
  history?: History[];
  midiSelection: {
    cc: number;
    value: number;
  };
  generationOptions: GenerationOptions;
  markovData?: MarkovModelData;
}

export interface Project {
  songs: Song[];
  lastSavePath?: string;
  activeSongId?: string,
  recordingLength?: number;
}
