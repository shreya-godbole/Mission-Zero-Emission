// main.js

'use strict'
var os = require('os');

var {dialog} = require('electron');

var app = require('electron').app;

var BrowserWindow = require('electron').BrowserWindow;

var MainWindow = null;

var ipc = require('electron').ipcMain;

const { spawn } = require('child_process'); // Import the child_process module
const path = require('path');

ipc.on('close-main-window', function(){
    //to close the app
    app.quit();
})

app.on('ready', function(){
    //initialize window
    MainWindow = new BrowserWindow({
        resizable: true,
        height:600,
        width:800,
        webPreferences:{
            contextIsolation: false,
            enableRemoteModule: true, // This might also be needed for some Electron versions
            preload: __dirname + '/preload.js'
        }
    })

    MainWindow.loadURL('file:' +__dirname + '/index.html');

    MainWindow.on('closed', function(){
        //to release any resources used 
        MainWindow = null;
    })

    //retrieve event sent by renderer process
    ipc.on('open-file-dialog', async function(event){
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            const selectedFilePath = filePaths[0];
            event.sender.send('send-selected-file', selectedFilePath);
            const joularjxTargetPath = 'C:\\joularjx\\target'; // The fixed path for the JoularJX agent
            
            const javaProcess = spawn('java', [
                `-javaagent:${path.join(joularjxTargetPath, 'joularjx-3.0.0.jar')}`,
                selectedFilePath
            ], { cwd: joularjxTargetPath });

            let joulesLine = ''; // Variable to store the line with joules consumption

            // Capture stdout and filter for "Program consumed" line
            javaProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes("Program consumed")) {
                    joulesLine = output.trim(); // Store only this line
                }
            });
    
            // Handle `stderr` as error output, or JoularJX informational messages if needed
            javaProcess.stderr.on('data', (data) => {
                const output = data.toString();
                if (output.includes('ERROR') || output.includes('Exception')) {
                    // If the line seems like an error, send it as 'error'
                    event.sender.send('java-command-output', { type: 'error', message: output });
                } else {
                    // Otherwise, treat it as an informational message
                    event.sender.send('java-command-output', { type: 'info', message: output });
                }
            });
    
            javaProcess.on('close', (code) => {
                if (code === 0 && joulesLine) {
                    event.sender.send('java-command-result', { success: true, output: joulesLine });
                } else {
                    event.sender.send('java-command-result', { success: false, output: "Java command failed to execute." });
                }
            });
        }
    })
})
