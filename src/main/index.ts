import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { initDatabase } from './db/database'
import { registerIpcHandlers } from './ipc/handlers'
import { setCredentials } from './ebay/client'
import { setMainWindow } from './engine/engine'
import { ensureCategoriesLoaded } from './ebay/taxonomy'
import { getCredentials } from './store'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    title: 'eBay-GoGo',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  setMainWindow(mainWindow)

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Initialize database
  await initDatabase()

  // Load credentials into eBay client
  const creds = getCredentials()
  if (creds.appId || creds.oauthToken) {
    setCredentials(creds)
  }

  // Load bundled categories if DB is empty
  ensureCategoriesLoaded()

  // Register IPC handlers
  registerIpcHandlers()

  // Create window
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
