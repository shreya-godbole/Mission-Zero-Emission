const ini = require('ini');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');
const getCarbonIntensity = require('./scripts/carbonIntensity');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const getCarbonFootprint = require('./scripts/carbonFootprint');
const { Console } = require('console');
const axios = require('axios');  // Import axios for making HTTP requests
const backendURL = "http://127.0.0.1:5000"; // Backend URL

// Load the configuration from the config.ini file
const config = ini.parse(fs.readFileSync(path.join(__dirname, 'config.ini'), 'utf-8'));

// Initialize the database using the path from the config file
const db = new Database(config.database.db_path);

// Create the table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS all_data (
        id TEXT PRIMARY KEY,
        date TEXT,
        file TEXT,
        runtime TEXT,
        joules TEXT,
        zoneID TEXT,
        carbonFootprint TEXT,
        use_case TEXT
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

    ipcMain.on('calculate-total-cf', async (event, { frequency, weeks, selectedFilename }) => {
        console.log(frequency);
        console.log(weeks);
        console.log(selectedFilename);
    
        // Check if any of the parameters are missing or invalid
        if (!selectedFilename || !frequency || !weeks) {
            console.error("One or more parameters are invalid or missing.");
            event.sender.send('total-cf-result', {
                success: false,
                output: "Missing or invalid parameters. Please ensure 'frequency', 'weeks', and 'selectedFilename' are provided.",
            });
            return;
        }
    
        try {
            let data;
    
            try {
                // Fetch the latest carbon footprint value for the selected file
                const response = await axios.get(`${backendURL}/fetch-carbon-footprint?file=${selectedFilename}`);
                //console.log("received the response data: ", response.data);  // Logs only the data
                data = response.data;  // Stores the data
            } catch (error) {
                console.error("Error fetching data:", error);
                // Handle the error (e.g., show an error message to the user)
                event.sender.send('total-cf-result', {
                    success: false,
                    output: "Error fetching carbon footprint data.",
                });
                return;
            }
    
            // Proceed if data is received and contains entries
            if (data && data.length > 0) {
                console.log("inside if", data);
    
                // Sort the entries based on the date and endTime
                const latestEntry = data.sort((a, b) => {
                    const datetimeA = new Date(`${a.date}T${a.endTime}`);
                    const datetimeB = new Date(`${b.date}T${b.endTime}`);
                    return datetimeB - datetimeA; // Latest entry first
                })[0];
    
                const carbonFootprintOutput = latestEntry.carbonFootprint; // Assuming carbonFootprint is a field in the response
                console.log("Latest Carbon Footprint:", carbonFootprintOutput);
    
                // Calculate the total carbon footprint
                const totalExecutions = frequency * weeks;
                const totalCarbonFootprint = totalExecutions * carbonFootprintOutput;
    
                // Send the result back to the renderer process
                event.sender.send('total-cf-result', {
                    success: true,
                    output: totalCarbonFootprint,
                });
                return totalCarbonFootprint;
            } else {
                // If no data is available for the selected file
                event.sender.send('total-cf-result', {
                    success: false,
                    output: "No data found for the selected file.",
                });
                return null;
            }
        } catch (error) {
            console.error("Error during calculation:", error);
    
            // Handle any unexpected errors
            event.sender.send('total-cf-result', {
                success: false,
                output: "An unexpected error occurred during calculation.",
            });
            return null;
        }
    });
    
    ipcMain.on('open-file-dialog', async function(event) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            const selectedFilePath = filePaths[0];
            const fileExtension = path.extname(selectedFilePath).toLowerCase();

            event.sender.send('send-selected-file', selectedFilePath);

            const agentPath = joularjxTargetPath;
            let javaArgs = [];

            if (fileExtension === '.jar') {
                javaArgs = ['--enable-preview', `-javaagent:${agentPath}`, '-jar', selectedFilePath];
            } else if(fileExtension === '.java'){
                javaArgs = [`-javaagent:${agentPath}`, selectedFilePath];
            } else {
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
                    InteractiveWindow = null;
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
                    const rows = db.prepare('SELECT DISTINCT use_case FROM all_data').all();
                    const useCases = rows.map(row => row.use_case); // Extract use-case values
                    useCaseWindow.webContents.send('previous-use-cases', useCases);
                  });
              }

              ipcMain.on('save-use-case', (event, data) => {
                const { useCase, currentFullID } = data; // Destructure values
                useCaseInput = useCase;
                const tempFullID = currentFullID;
                const stmt = db.prepare('UPDATE all_data SET use_case = ? WHERE id = ?');
                stmt.run(useCase, fullID);
                fullID = null;
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
                let start = new Date(`1970-01-01T${startTime}Z`);
                let end = new Date(`1970-01-01T${endTime}Z`);
                let totalTimeInSeconds = (end - start) / 1000;
                console.log(`Total running time: ${totalTimeInSeconds} seconds`);
                
                if (code === 0 && joulesLine && fullID) { // Check if both variables are set
                    if(selectedZoneId !== null){
                        getCarbonIntensity(selectedZoneId)
                        .then(carbonIntensity => {
                            return getCarbonFootprint(carbonIntensity, joulesValue);
                        })
                        .then(carbonFootprint => {
                            carbonFootprintOutput = carbonFootprint;
                            console.log(`Carbon Footprint: ${carbonFootprintOutput} grams`);

                            try {
                                // Debugging output to check values before insertion
                                console.log('Inserting into database:');
                                console.log('ID:', fullID);
                                console.log('File Path:', selectedFilePath);
                                console.log('Joules Line:', joulesLine);
                    
                                const stmt = db.prepare('INSERT INTO all_data (id, date, file, runtime, joules, zoneID, carbonFootprint) VALUES (?, ?, ?, ?, ?, ?, ?)');
                                stmt.run(fullID, dateMatch, selectedFilePath, totalTimeInSeconds, joulesValue, selectedZoneId, carbonFootprintOutput);
                                console.log('Data successfully saved to database');
                                MainWindow.webContents.send('java-command-result', { success: true, output: joulesLine });
                                MainWindow.webContents.send('cf-calculation-result', {success: true, output: carbonFootprintOutput });
                                MainWindow.webContents.send('prompt-use-case', fullID);
                            } catch (err) {
                                console.error('Error while inserting into database:', err.message);
                                MainWindow.webContents.send('java-command-result', { success: false, output: "Failed to save data to database." });
                                MainWindow.webContents.send('cf-calculation-result', { success: false, output: "Failed to calculate carbon footprint." });
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                    }
                } else {
                    console.error('Error during program execution:', outputBuffer || 'No output captured');
                    MainWindow.webContents.send('java-command-result', { success: false, output: outputBuffer || 'No output captured' });
                }                
            }); 
        }
    });
});
