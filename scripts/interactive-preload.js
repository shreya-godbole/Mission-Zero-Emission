const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendUserInput: (input) => ipcRenderer.send('user-input', input),
    receiveProcessOutput: (callback) => ipcRenderer.on('process-output', (event, output) => callback(output))
});
