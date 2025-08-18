import { ipcMain } from 'electron';
import * as mainApp from '../app'

// should register all the different functions in here
export function init() {

  // sequencer playback
  ipcMain.handle('sequencer:record', () => {
    mainApp.startRecording();
  });
  ipcMain.handle('sequencer:stopRecording', () => { mainApp.stopRecording(); });
  ipcMain.handle('sequencer:startPlayback', () => { mainApp.startPlayback(); });
  ipcMain.handle('sequencer:stopPlayback', () => { mainApp.stopPlayback(); });
  ipcMain.handle('sequencer:generate', () => { mainApp.generate(); });

}



