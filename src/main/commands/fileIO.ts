import { dialog, ipcMain, ipcRenderer } from "electron";
import { loadProject } from "../app";
import { parseMidiFile } from "../midi/fileIO";
import { NoteEvent } from '../types';


async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Please select midi files',
    filters: [
      {
        extensions: ['mid', 'midi'],
        name: 'midi',
      }
    ],
    properties: [
      'openDirectory',
      'openFile',
      'multiSelections',
    ]

  });
  // parse midi files immediately
  const output = {
    canceled,
    filePaths,
    midiFiles: [] as { name: string, filePath: string, notes: NoteEvent[] }[],
  };
  if (!canceled) {
    const midiFilesPromises = filePaths.map((filepath) => {
      return parseMidiFile(filepath);
    });
    const res = await Promise.all(midiFilesPromises);
    const midiFiles = res.map((entry, index) => {
      return {
        notes: entry,
        name: filePaths[index].split(/[/\\]/).slice(-1)[0],
        filePath: filePaths[index],
      }
    });
    output.midiFiles = midiFiles;

  }
  return output;
}

export function init() {
  ipcMain.handle('dialog:openFile', handleFileOpen);
}

