const ini = require('ini');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const getCarbonIntensity = require('./scripts/carbonIntensity');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const getCarbonFootprint = require('./scripts/carbonFootprint');

// Load the configuration from the config.ini file
const config = ini.parse(fs.readFileSync(path.join(__dirname, 'config.ini'), 'utf-8'));


// Initialize the database using the path from the config file
const db = new Database(config.database.db_path);

// Create the table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS measurements_data (
        id TEXT PRIMARY KEY,
        date TEXT,
        file TEXT,
        startTime TEXT,
        endTime TEXT,
        joules TEXT,
        zoneID TEXT,
        carbonFootprint TEXT
    )
`);

// Access settings from the config
const joularjxTargetPath = config.settings.joularjx_path;
const executionPath = config.settings.cwd;
const resultsDirjoular = config.settings.results_dir;
const dbPath = config.database.db_path;
let selectedZoneId = 'IN';
let carbonFootprintOutput;


app.on('ready', function() {
    let MainWindow = new BrowserWindow({
        resizable: true,
        height: 800,
        width: 1000,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false  
        }
    });
    

    MainWindow.loadURL('file:' + __dirname + '/index.html');

    let InteractiveWindow = null;

    ipcMain.on('zone-id-selected', (event, zoneId) => {
        console.log('Received Zone ID:', zoneId);
        selectedZoneId = zoneId;
    });

    ipcMain.on('open-file-dialog', async function(event) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            const selectedFilePath = filePaths[0];
            const fileExtension = path.extname(selectedFilePath).toLowerCase();

            event.sender.send('send-selected-file', selectedFilePath);

            // const joularjxTargetPath = 'C:\\joularjx\\target';
            // const agentPath = path.join(joularjxTargetPath, 'joularjx-3.0.0.jar');
            const agentPath = joularjxTargetPath;
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

            const javaProcess = spawn('java', javaArgs, { cwd: executionPath });
            let joulesLine = '';
            let outputBuffer = '';
            let fullID = '';
            let dateMatch;
            let joulesValue;
            let startTime = null; 
            let endTime = null;
            let programRuntime = ''
            let useCaseInput = '';

            if (!InteractiveWindow) {
                InteractiveWindow = new BrowserWindow({
                    width: 800,
                    height:600,
                    webPreferences: {
                        contextIsolation: true,
                        preload: path.join(__dirname, 'preload.js'),
                        nodeIntegration: false 
                    }
                });

                InteractiveWindow.loadURL('file://' + __dirname + './views/interactive.html');
                InteractiveWindow.on('closed', () => {
                    createUseCaseWindow();
                });
            }

            function createUseCaseWindow() {
                let useCaseWindow = new BrowserWindow({
                  width: 400,
                  height: 300,
                  modal: true,
                  webPreferences: {
                    nodeIntegration: true,
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                  }
                });
                useCaseWindow.loadFile('./views/useCase.html'); // HTML file for the pop-up
                useCaseWindow.webContents.once('did-finish-load', () => {
                    const rows = db.prepare('SELECT DISTINCT use_case FROM measurements_data').all();
                    const useCases = rows.map(row => row.use_case); // Extract use-case values
                    useCaseWindow.webContents.send('previous-use-cases', useCases);
                  });
              }

              ipcMain.on('save-use-case', (event, useCase) => {
                useCaseInput = useCase;
                const stmt = db.prepare('UPDATE measurements_data SET use_case = ? WHERE id = ?');
                stmt.run(useCase, fullID);
              
                // Close the use-case window
                BrowserWindow.getFocusedWindow().close();
              });

            javaProcess.stdout.on('data', (data) => {
                const output = data.toString();
                outputBuffer += output;
                MainWindow.webContents.send('java-output', output);
                if (InteractiveWindow) {
                    InteractiveWindow.webContents.send('java-output', output);
                }

                if (!startTime) {
                    const firstLineMatch = output.match(/\d{2}:\d{2}:\d{2}/);
                    if (firstLineMatch) {
                        startTime = firstLineMatch[0];
                    }
                }

                const match = output.match(/Program consumed ([0-9]*\.?[0-9]+) joules/);
                if (match) {
                    joulesLine = match[0];
                    joulesValue = parseFloat(match[1]);
                }
            });

            javaProcess.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                outputBuffer += errorOutput;

                if (!startTime) {
                    const firstLineMatch = errorOutput.match(/\d{2}:\d{2}:\d{2}/);
                    if (firstLineMatch) {
                        startTime = firstLineMatch[0];
                    }
                }

                const match = errorOutput.match(/Program consumed ([0-9]*\.?[0-9]+) joules/);
                if (match) {
                    joulesLine = match[0]; 
                    joulesValue = parseFloat(match[1]); 
                }
                dateMatch = errorOutput.match(/\d{2}\/\d{2}\/\d{4} /); 
                if (dateMatch) {
                    dateLine = dateMatch[0]; // Capture the date
                }
                const idMatch = errorOutput.match(/Results will be stored in joularjx-result\/(\d{5,}-\d+)/);
                if (idMatch && idMatch[1]) {
                    fullID = idMatch[1]; // Store the full ID
                    console.log('Extracted Full ID:', fullID); 
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
                const lastLine = outputBuffer.trim().split('\n').slice(-1)[0];
                const lastTimeMatch = lastLine.match(/\d{2}:\d{2}:\d{2}/);
                if (lastTimeMatch) {
                    endTime = lastTimeMatch[0];
                }

                console.log(`Start Time: ${startTime}, End Time: ${endTime}`);
                if (code === 0 && joulesLine && fullID) { // Check if both variables are set
                    console.log(`Zone ID: ${selectedZoneId}`);
                    if(selectedZoneId !== null){
                        getCarbonIntensity(selectedZoneId)
                        .then(carbonIntensity => {
                            // Use carbonIntensity value in your logic
                            console.log(`Carbon Intensity: ${carbonIntensity}`);
                            return getCarbonFootprint(carbonIntensity, joulesValue);
                        })
                        .then(carbonFootprint => {
                            // Use carbonFootprint value in your logic
                            carbonFootprintOutput = carbonFootprint;
                            console.log(`Carbon Footprint: ${carbonFootprintOutput} grams`);

                            try {
                                // Debugging output to check values before insertion
                                console.log('Inserting into database:');
                                console.log('ID:', fullID);
                                console.log('File Path:', selectedFilePath);
                                console.log('Joules Line:', joulesLine);
                    
                                const stmt = db.prepare('INSERT INTO measurements_data (id, date, file, startTime, endTime, joules, zoneID, carbonFootprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                                stmt.run(fullID, dateMatch, selectedFilePath, startTime, endTime, joulesValue, selectedZoneId, carbonFootprintOutput);
                                console.log('Data successfully saved to database');
                                MainWindow.webContents.send('java-command-result', { success: true, output: joulesLine });
                                MainWindow.webContents.send('cf-calculation-result', {success: true, output: carbonFootprintOutput });
                            } catch (err) {
                                console.error('Error while inserting into database:', err.message); // Log the error message
                                MainWindow.webContents.send('java-command-result', { success: false, output: "Failed to save data to database." });
                                MainWindow.webContents.send('cf-calculation-result', { success: false, output: "Failed to calculate carbon footprint." });
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                    }
                } else {
                    // Debugging output to understand why the insertion didn't happen
                    console.error('Insertion failed:');
                    console.error('Exit Code:', code);
                    console.error('Joules Line:', joulesLine);
                    console.error('Full ID:', fullID);
                    MainWindow.webContents.send('java-command-result', { success: false, output: outputBuffer || 'No output captured' });
                }
            });            
        }
    });
});
