import { ipcMain, ipcRenderer } from 'electron';
import { getCurrentProject, loadProject, saveProject, updateProject } from "../app/project";
import { Project } from '../types';

export default function init() {
  ipcMain.handle('project:getCurrent', (_event) => {
    console.log('hello')
    return getCurrentProject();
  });
  ipcMain.handle('project:update', (_event, project: Partial<Project>) => {
    console.log('updating project', project);

    updateProject(project);
  });
  ipcMain.handle('project:load', (_event, path: string) => {
    return loadProject(path);
  });
  ipcMain.handle('project:save', (_event, path: string) => {
    return saveProject(path);
  });
}
