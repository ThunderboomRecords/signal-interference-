
// Load, Save and update project and create project
// Active project is always stored in the most recent file
import { app } from 'electron';
import { ACTIVE_PROJECT_APP_DATA_FILENAME, DEFAULT_BEAT_PER_BAR } from '../constants';
import { GenerationStemData, NoteHistory, Project as ProjectI, Song as SongI, TrainingData } from '../types';
import * as path from 'path';
import fs from 'fs/promises';
import { FileEdit } from 'lucide-react';

class Song implements SongI {
  trainingData: TrainingData[];
  beatsPerBar: number;
  history?: NoteHistory[];
  stemData: GenerationStemData[];
  constructor(beatsPerBar = DEFAULT_BEAT_PER_BAR) {
    this.trainingData = [];
    this.beatsPerBar = beatsPerBar;
    this.history = [];
    this.stemData = [];
  }

}
class Project implements ProjectI {
  songs: SongI[];
  lastSavePath?: string;
  constructor() {
    this.songs = [];
    this.lastSavePath = undefined;
  }
}

let currentProject = new Project();

// TODO: add a history of projects

async function updateProjectInAppData(project: ProjectI) {
  const appDataPath = app.getPath('appData');
  const projectPath = path.join(appDataPath, ACTIVE_PROJECT_APP_DATA_FILENAME);
  const data = JSON.stringify(project, null, 0);
  try {
    await fs.writeFile(projectPath, data);
  } catch (err) {
    console.error('something went wrong while updating the project in cache', err);
  }
}
async function loadProjectInAppData() {
  const appDataPath = app.getPath('appData');
  const projectPath = path.join(appDataPath, ACTIVE_PROJECT_APP_DATA_FILENAME);
  loadProject(projectPath);
}
export function createProject() {
  // should warn before opening a new project (in renderer)
  console.log('creating new project');
  currentProject = new Project();
  updateProjectInAppData(currentProject);
  return currentProject;
}

export async function saveProject(filePath: string) {
  // fault should propagate to UI
  const hasJSONExtension = filePath.split('.').slice(-1)[0].toLowerCase() === 'json';
  if (!hasJSONExtension) {
    filePath = `${filePath}.json`;
  }
  currentProject.lastSavePath = filePath;

  await updateProjectInAppData(currentProject);
  const data = JSON.stringify(currentProject, null, 0);
  await fs.writeFile(filePath, data);
}
export async function loadProject(path: string) {
  // loads as project from a specific path
  // Note should warn in the UI that it will override the current project
  console.log('loading project', path);
  const project = JSON.parse((await fs.readFile(path)).toString());
  currentProject = project;
  await updateProjectInAppData(currentProject);
  return project;
}

export async function updateProject(project: Partial<ProjectI>) {
  // can do a partial update
  const updatedProject = { ...currentProject, ...project };
  currentProject = updatedProject;
  await updateProjectInAppData(currentProject);
}
// basically new project
export function deleteProject() {
  return createProject();
}

// loads it on boot.
loadProjectInAppData();

