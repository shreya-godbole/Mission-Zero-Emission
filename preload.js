// preload.js
const { ipcRenderer } = require('electron');
window.ipc = ipcRenderer; // Expose ipcRenderer to the renderer process

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onFileSelected: (callback) => ipcRenderer.on('send-selected-file', callback),
    sendOpenFileDialog: () => ipcRenderer.send('open-file-dialog'),
    onJavaCommandResult: (callback) => ipcRenderer.on('java-command-result', callback),
});