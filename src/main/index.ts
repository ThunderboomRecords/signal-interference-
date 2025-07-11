import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup'; // eslint-disable-line @typescript-eslint/no-var-requires
import initCommands from './commands';
import * as mainApp from './app';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}


initCommands();
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload/index.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          click: () => {
            mainApp.newProject();
          },
        },
        {
          label: 'Save Project',
          click: async () => {
            mainApp.saveProjectWithDialog();
          },
        },
        {
          label: 'Load Project',
          click: async () => {
            mainApp.openProjectWithDialog();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Open theDevTools.
  mainWindow.webContents.openDevTools();

  mainApp.init(mainWindow);
  mainWindow.on('ready-to-show', () => {
    mainApp.loadSettings(mainWindow);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    //createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
