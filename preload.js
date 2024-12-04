const { contextBridge, ipcRenderer } = require('electron');

// Expose ipcRenderer methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    onUseCaseData: (callback) => ipcRenderer.on('previous-use-cases', (event, useCases) => callback(useCases)),
    sendUseCase: (useCase, fullID) => {
        ipcRenderer.send('save-use-case', { useCase, fullID });
      },

      onPromptUseCase: (callback) => {
        ipcRenderer.on('prompt-use-case', (event, fullID) => {
          callback(fullID);
        });
      },

    sendZoneSelected: (zoneId) => ipcRenderer.send('zone-id-selected', zoneId),
    
    // Trigger file dialog
    sendOpenFileDialog: () => ipcRenderer.send('open-file-dialog'),

    // Listen for selected file path
    onFileSelected: (callback) => ipcRenderer.on('send-selected-file', (_, path) => callback(path)),

    // Listen for Java program output (for both main and interactive windows)
    onJavaOutput: (callback) => ipcRenderer.on('java-output', (_, data) => callback(data)),

    // Listen for Java command result
    onJavaCommandResult: (callback) => ipcRenderer.on('java-command-result', (_, data) => callback(data)),

    // Send user input from the interactive window
    sendUserInput: (input) => ipcRenderer.send('send-user-input', input),

    // Listen for carbon footprint calculation result
    onCfCalculationResult: (callback) => ipcRenderer.on('cf-calculation-result', (_, data) => callback(data)),

    // General purpose request-response communication
    requestData: (message) => ipcRenderer.send('request-data', message),
    onSendResponse: (callback) => ipcRenderer.on('send-response', (_, data) => callback(data)),
});
