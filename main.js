const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const db = new Database('energy_measurement.db');

// Create the table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS measurements (
        id TEXT PRIMARY KEY,
        joules TEXT
    )
`);

app.on('ready', function() {
    let MainWindow = new BrowserWindow({
        resizable: true,
        height: 600,
        width: 800,
        webPreferences: {
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    MainWindow.loadURL('file:' + __dirname + '/index.html');

    let InteractiveWindow = null;

    ipcMain.on('open-file-dialog', async function(event) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            const selectedFilePath = filePaths[0];
            const fileExtension = path.extname(selectedFilePath).toLowerCase();

            // const javaClassName = path.basename(selectedFilePath, '.java'); // Extracts class name
            // const resultsDir = path.join(__dirname, 'results', javaClassName); // Create a unique results folder for the class
            // // Create the directory if it doesn't exist
            // if (!fs.existsSync(resultsDir)) {
            //     fs.mkdirSync(resultsDir, { recursive: true });
            // }
             //const joularjxTargetPath = path.join(process.env.HOME, 'joularjx', 'target');
            //const joularjxJarPath = path.join(joularjxTargetPath, 'joularjx-3.0.0.jar');
            // const javaProcess = spawn('/usr/lib/jvm/java-17-openjdk-amd64/bin/java', [
            //     `-javaagent:${joularjxJarPath}`,
            //     selectedFilePath ,
            //     javaClassName
            // ], { cwd: resultsDir });

            event.sender.send('send-selected-file', selectedFilePath);

            const joularjxTargetPath = 'C:\\joularjx\\target';
            const agentPath = path.join(joularjxTargetPath, 'joularjx-3.0.0.jar');
            let javaArgs = [];

            if (fileExtension === '.jar') {
                javaArgs = ['--enable-preview', `-javaagent:${agentPath}`, '-jar', selectedFilePath];
            } else if(fileExtension === '.java'){
                javaArgs = [`-javaagent:${agentPath}`, selectedFilePath];
            }else {
                event.sender.send('java-command-result', {
                    success: false,
                    output: "Selected file must be a .jar or a .java file."
                });
                return;
            }

            const javaProcess = spawn('java', javaArgs, { cwd: joularjxTargetPath });
            let joulesLine = '';
            let outputBuffer = '';

            if (!InteractiveWindow) {
                InteractiveWindow = new BrowserWindow({
                    width: 500,
                    height: 300,
                    webPreferences: {
                        contextIsolation: false,
                        preload: path.join(__dirname, 'preload.js')
                    }
                });

                InteractiveWindow.loadURL('file://' + __dirname + '/interactive.html');
                InteractiveWindow.on('closed', () => (InteractiveWindow = null));
            }

            javaProcess.stdout.on('data', (data) => {
                const output = data.toString();
                outputBuffer += output;
                MainWindow.webContents.send('java-output', output);
                if (InteractiveWindow) {
                    InteractiveWindow.webContents.send('java-output', output);
                }

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

            javaProcess.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                outputBuffer += errorOutput;
                const match = errorOutput.match(/Program consumed \d+(\.\d+)? joules/);
                if (match) {
                    joulesLine = match[0];
                }
                const idMatch = errorOutput.match(/Results will be stored in joularjx-result\/(\d{5,}-\d+)/);
                if (idMatch && idMatch[1]) {
                    fullID = idMatch[1]; // Store the full ID
                    firstFiveDigits = idMatch[1].split('-')[0]; // Store only the first 5 digits
                    console.log('Extracted Full ID:', fullID); // Debugging output
                    console.log('First 5 Digits of ID:', firstFiveDigits); 
                }

                MainWindow.webContents.send('java-output', errorOutput);
                if (InteractiveWindow) {
                    InteractiveWindow.webContents.send('java-output', errorOutput);
                }
            });

            ipcMain.on('send-user-input', (event, userInput) => {
                if (javaProcess.stdin.writable) {
                    javaProcess.stdin.write(`${userInput}\n`);
                }
            });

            javaProcess.on('close', (code) => {
                if (code === 0 && joulesLine) {
                    try {
                        const stmt = db.prepare('INSERT INTO measurements (id, joules) VALUES (?, ?)');
                        stmt.run(fullID, joulesLine);
                        console.log('Data successfully saved to database');
                        MainWindow.webContents.send('java-command-result', { success: true, output: joulesLine });
                    } catch (err) {
                        MainWindow.webContents.send('java-command-result', { success: false, output: "Failed to save data to database." });
                    }
                } else {
                    MainWindow.webContents.send('java-command-result', { success: false, output: outputBuffer || 'No output captured' });
                }
            });
        }
    });
});
