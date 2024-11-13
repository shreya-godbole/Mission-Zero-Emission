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
    
            const javaClassName = path.basename(selectedFilePath, '.java'); // Extracts class name
            const resultsDir = path.join(__dirname, 'results', javaClassName); // Create a unique results folder for the class

            // Create the directory if it doesn't exist
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
            }

            //const joularjxTargetPath = path.join(process.env.HOME, 'joularjx', 'target');
            //const joularjxJarPath = path.join(joularjxTargetPath, 'joularjx-3.0.0.jar');

            const javaProcess = spawn('/usr/lib/jvm/java-17-openjdk-amd64/bin/java', [
                `-javaagent:${joularjxJarPath}`,
                selectedFilePath ,
                javaClassName
            ], { cwd: resultsDir });

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

            
            // To few error/info on console
            // javaProcess.stderr.on('data', (data) => {
            //     const output = data.toString();
            //     if (output.includes('[INFO]')) {
            //         console.log(output);
            //     } else {
            //         console.error('Error:', output);
            //     }
            // });
            
    
            javaProcess.on('close', (code) => {
                console.log(`Java Process Exit Code: ${code}`);
                if (code === 0 && joulesLine) {
                    try {
                        // Save to SQLite using Better-SQLite3
                        const stmt = db.prepare('INSERT INTO measurements (id, joules) VALUES (?, ?)');
                        stmt.run(fullID, joulesLine);

                        console.log('Data successfully saved to database');
                        event.sender.send('java-command-result', { success: true, output: joulesLine });
                    } catch (err) {
                        console.error('Error inserting into database:', err.message);
                        event.sender.send('java-command-result', { success: false, output: "Failed to save data to database." });
                    }
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