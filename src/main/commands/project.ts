import { ipcMain } from 'electron';
import {
  openProjectWithDialog,
  saveHistoryOfCurrentSongWithDialog,
  saveProjectWithDialog,
  stripProjectForRenderer,
  updateProject,
  addNewSong,
  setActiveSong,
} from '../app';
import {
  deleteSong,
  getCurrentProject,
  loadProject,
  saveProject,
} from "../app/project";
import { Project, Song } from '../types';

export default function init() {
  ipcMain.handle('project:getCurrent', () => {
    return stripProjectForRenderer(getCurrentProject());
  });
  ipcMain.handle('project:update', async (_event, project: Partial<Project>) => {
    return updateProject(project).then(async (proj) => { return stripProjectForRenderer(proj); });
  });
  ipcMain.handle('project:load', (_event, path: string) => {
    return loadProject(path);
  });
  ipcMain.handle('project:save', (_event, path: string) => {
    return saveProject(path);
  });
  ipcMain.handle('project:saveWithDialog', () => {
    return saveProjectWithDialog();
  });
  ipcMain.handle('project:openWithDialog', () => {
    return openProjectWithDialog();
  })
  ipcMain.handle('project:newSong', async () => {
    return addNewSong().then(async (proj) => { return stripProjectForRenderer(proj); });
  });
  ipcMain.handle('project:deleteSong', (_event, song: Partial<Song>) => {
    return deleteSong(song);
  });
  ipcMain.handle('project:selectSong', (_event, song: Song) => {
    return setActiveSong(song.id);
  });
  ipcMain.handle('project:saveHistory', () => {
    return saveHistoryOfCurrentSongWithDialog();
  })
}
