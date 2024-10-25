// preload.js
const { ipcRenderer } = require('electron');

window.ipc = ipcRenderer; // Expose ipcRenderer to the renderer process
