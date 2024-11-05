const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

app.on('ready', function() {
    let MainWindow = new BrowserWindow({
        resizable: true,
        height: 600,
        width: 800,
        webPreferences: {
            contextIsolation: false,
            enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    MainWindow.loadURL('file:' + __dirname + '/index.html');

    MainWindow.on('closed', function() {
        MainWindow = null;
    });

    ipcMain.on('open-file-dialog', async function(event) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile']
        });
    
        if (!canceled && filePaths.length > 0) {
            const selectedFilePath = filePaths[0];
            event.sender.send('send-selected-file', selectedFilePath);
    
            const joularjxTargetPath = 'C:\\joularjx\\target';
            const javaProcess = spawn('java', [
                `-javaagent:${path.join(joularjxTargetPath, 'joularjx-3.0.0.jar')}`,
                selectedFilePath
            ], { cwd: joularjxTargetPath });
    
            let joulesLine = '';
            let outputBuffer = '';
    
            // Capture stdout
            javaProcess.stdout.on('data', (data) => {
                const output = data.toString();
                outputBuffer += output;
    
                // Use regex to find only the "Program consumed X joules" part
                const match = output.match(/Program consumed \d+(\.\d+)? joules/);
                if (match) {
                    joulesLine = match[0];
                }
            });
    
            // Capture stderr
            javaProcess.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                outputBuffer += errorOutput;
    
                // Use regex to find only the "Program consumed X joules" part
                const match = errorOutput.match(/Program consumed \d+(\.\d+)? joules/);
                if (match) {
                    joulesLine = match[0];
                }
            });
    
            javaProcess.on('close', (code) => {
                console.log(`Java Process Exit Code: ${code}`);
                if (code === 0 && joulesLine) {
                    event.sender.send('java-command-result', { success: true, output: joulesLine });
                } else {
                    const fullOutput = `Full Output:\n${outputBuffer || 'No output captured'}`;
                    event.sender.send('java-command-result', { success: false, output: fullOutput });
                }
            });
        }
    });  
      
});