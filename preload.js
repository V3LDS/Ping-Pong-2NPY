const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Remove PeerJS specific methods
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  onMessage: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
