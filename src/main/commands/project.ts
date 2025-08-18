import { ipcMain } from 'electron';
import {
  openProjectWithDialog,
  saveHistoryOfCurrentSongWithDialog,
  saveProjectWithDialog,
  stripProjectForRenderer,
} from '../app';
import {
  addNewsong,
  deleteSong,
  getCurrentProject,
  loadProject,
  saveProject,
  setActiveSong,
  updateProject
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
    const proj = addNewsong();
    return proj.then(async (proj) => { return stripProjectForRenderer(proj); });
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
