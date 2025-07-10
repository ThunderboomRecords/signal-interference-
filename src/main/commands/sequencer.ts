import { ipcMain } from 'electron';
import * as mainApp from '../app'
import { getCurrentProject } from '../app/project';
import { getMidiIOPorts } from '../midi/io';

// should register all the different functions in here
export function init() {

  // sequencer playback
  ipcMain.handle('sequencer:record', (_event) => {
    mainApp.startRecording();
  });
  ipcMain.handle('sequencer:stopRecording', (_event) => { mainApp.stopRecording(); });
  ipcMain.handle('sequencer:startPlayback', (_event) => { mainApp.startPlayback(); });
  ipcMain.handle('sequencer:stopPlayback', (_event) => { mainApp.stopPlayback(); });
  ipcMain.handle('sequencer:generate', (_event) => { mainApp.generate(); });

}



