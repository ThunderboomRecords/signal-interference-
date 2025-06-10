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
