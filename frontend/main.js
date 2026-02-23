const { app, BrowserWindow, Notification, shell, Tray, Menu, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let pythonProcess;
let tray;

const BACKEND_PORT = 8888;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

function startPythonBackend() {
  // In development, run python directly
  // In production, use the bundled executable
  const isDev = !app.isPackaged;
  let backendPath;

  if (isDev) {
    backendPath = path.join(__dirname, '..', 'backend');
    pythonProcess = spawn('python', ['main.py'], {
      cwd: backendPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } else {
    const resourcePath = path.join(process.resourcesPath, 'backend');
    pythonProcess = spawn('python', ['main.py'], {
      cwd: resourcePath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Backend] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function waitForBackend(maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0;

    function check() {
      const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', () => {
        retry();
      });

      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    }

    function retry() {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error('Backend failed to start'));
      } else {
        setTimeout(check, 1000);
      }
    }

    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'eBay-GoGo',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enable webview for eBay checkout
    },
  });

  // Load the React app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  // Create a simple tray icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show eBay-GoGo', click: () => mainWindow && mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('eBay-GoGo');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow && mainWindow.show());
}

app.whenReady().then(async () => {
  startPythonBackend();

  try {
    await waitForBackend();
    console.log('Backend is ready');
  } catch (err) {
    console.error('Failed to start backend:', err.message);
  }

  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
});
