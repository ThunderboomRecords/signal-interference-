import { ipcMain } from 'electron';
import * as mainApp from '../app'
import { getMidiIOPorts } from '../midi/io';

// should register all the different functions in here
export function init() {

  // sequencer playback
  ipcMain.handle('sequencer:record', (_event) => { mainApp.startRecording(); });
  ipcMain.handle('sequencer:stopRecording', (_event) => { mainApp.stopRecording(); });


}


