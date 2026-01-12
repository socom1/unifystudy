const { app, BrowserWindow, ipcMain } = require('electron');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = !app.isPackaged;

// Ignore certificate errors in development (for self-signed certs)
if (isDev) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
}

let splash;

function createSplashWindow() {
  splash = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.center();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../favicon/favicon.ico'), // App icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
    },
    titleBarStyle: 'hidden', // Hidden title bar for both Mac and Win
    titleBarOverlay: {
        color: '#0f1012', // Match --bg-1
        symbolColor: '#e2e8f0', // Match --color-text
        height: 35
    },
    show: false, // Don't show until ready
  });

  // In dev, load from localhost. In prod, load index.html
  if (isDev) {
    win.loadURL('http://localhost:5173'); // Use HTTP (Vite serves on both)
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'splash.html')); // Fallback if dist not found? No, should be dist/index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Check for updates after window is ready
  win.once('ready-to-show', () => {
    setTimeout(() => {
      if (splash) {
        splash.close();
      }
      win.show();
      win.focus();
      
      // Check for updates
      if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    }, 4500); // Match the splash screen animation duration approx
  });
}

// Auto-updater events
autoUpdater.on('update-available', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('update-downloaded');
});

autoUpdater.on('download-progress', (progressObj) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('download-progress', progressObj.percent);
});

// IPC Handlers for Update UI
ipcMain.on('check-for-updates', () => {
  if (!isDev) autoUpdater.checkForUpdates();
});

ipcMain.on('start-download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Register Custom Protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('unifystudy', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('unifystudy');
}

// Force Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (BrowserWindow.getAllWindows().length > 0) {
      const win = BrowserWindow.getAllWindows()[0];
      if (win.isMinimized()) win.restore();
      win.focus();
      
      // Handle Deep Link on Windows
      const deepLink = commandLine.find((arg) => arg.startsWith('unifystudy://'));
      if (deepLink) {
         handleDeepLink(win, deepLink);
      }
    }
  });

  // Handle Deep Link on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (BrowserWindow.getAllWindows().length > 0) {
        const win = BrowserWindow.getAllWindows()[0];
        handleDeepLink(win, url);
    }
  });

  app.whenReady().then(() => {
    createSplashWindow();
    createWindow();
  
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function handleDeepLink(win, url) {
    // Format: unifystudy://auth/callback?token=XYZ
    try {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        if (token) {
            win.webContents.send('google-auth-success', token);
            // Bring to front
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    } catch (e) {
        console.error('Deep link parse error:', e);
    }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
