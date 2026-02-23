const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open URL in system browser
  openExternal: (url) => shell.openExternal(url),

  // Desktop notifications
  showNotification: (title, body) => {
    new Notification(title, { body });
  },

  // Platform info
  platform: process.platform,
});
