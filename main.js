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
            let fullID = '';
            let firstFiveDigits = '';
    
            // Capture stdout
            javaProcess.stdout.on('data', (data) => {
                const output = data.toString();
                outputBuffer += output;
    
                // Use regex to find only the "Program consumed X joules" part
                const match = output.match(/Program consumed \d+(\.\d+)? joules/);
                if (match) {
                    joulesLine = match[0];
                }

                const idMatch = output.match(/Results will be stored in joularjx-result\/(\d{5,}-\d+)/);
                if (idMatch && idMatch[1]) {
                    fullID = idMatch[1]; // Store the full ID
                    firstFiveDigits = idMatch[1].split('-')[0]; // Store only the first 5 digits
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

                const idMatch = errorOutput.match(/Results will be stored in joularjx-result\/(\d{5,}-\d+)/);
                if (idMatch && idMatch[1]) {
                    fullID = idMatch[1]; // Store the full ID
                    firstFiveDigits = idMatch[1].split('-')[0]; // Store only the first 5 digits
                    console.log('Extracted Full ID:', fullID); // Debugging output
                    console.log('First 5 Digits of ID:', firstFiveDigits); // Debugging output
                }
            });
    
            javaProcess.on('close', (code) => {
                console.log(`Java Process Exit Code: ${code}`);
                if (code === 0 && joulesLine) {
                    event.sender.send('java-command-result', { success: true, 
                        output: joulesLine,
                        id: fullID,
                        shortId: firstFiveDigits
                     });
                } else {
                    const fullOutput = `Full Output:\n${outputBuffer || 'No output captured'}`;
                    event.sender.send('java-command-result', { success: false, output: fullOutput });
                }
            });
        }
    });  
      
});