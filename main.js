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
        joules TEXT
    )
`);

// Access settings from the config
const joularjxTargetPath = config.settings.joularjx_path;
const javaPath = config.settings.java_path;
//const resultsDir = config.settings.results_dir;
const dbPath = config.database.db_path;

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
            let fullID = '';
            let dateMatch;
            let joulesValue;
            let carbonFootprintOutput;

            if (!InteractiveWindow) {
                InteractiveWindow = new BrowserWindow({
                    width: 500,
                    height: 300,
                    webPreferences: {
                        contextIsolation: false,
                        preload: path.join(__dirname, 'preload.js')
                    }
                });

                InteractiveWindow.loadURL('file://' + __dirname + './views/interactive.html');
                InteractiveWindow.on('closed', () => (InteractiveWindow = null));
            }

            javaProcess.stdout.on('data', (data) => {
                const output = data.toString();
                outputBuffer += output;
                MainWindow.webContents.send('java-output', output);
                if (InteractiveWindow) {
                    InteractiveWindow.webContents.send('java-output', output);
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
                const match = errorOutput.match(/Program consumed ([0-9]*\.?[0-9]+) joules/);
                if (match) {
                    joulesLine = match[0]; 
                    joulesValue = parseFloat(match[1]); 
                }
                dateMatch = errorOutput.match(/\d{2}\/\d{2}\/\d{4} /); //\d{2}:\d{2}:\d{2}\.\d{3}/);
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
                if (code === 0 && joulesLine && fullID) { // Check if both variables are set
                    getCarbonIntensity('IN')
                        .then(carbonIntensity => {
                            // Use carbonIntensity value in your logic
                            console.log(`Carbon Intensity: ${carbonIntensity}`);
                            return getCarbonFootprint(carbonIntensity, joulesValue);
                        })
                        .then(carbonFootprint => {
                            // Use carbonFootprint value in your logic
                            carbonFootprintOutput = carbonFootprint;
                            console.log(`Carbon Footprint: ${carbonFootprint} grams`);
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                    try {
                        // Debugging output to check values before insertion
                        console.log('Inserting into database:');
                        console.log('ID:', fullID);
                        console.log('File Path:', selectedFilePath);
                        console.log('Joules Line:', joulesLine);
            
                        const stmt = db.prepare('INSERT INTO measurements_data (id, date, file, joules) VALUES (?, ?, ?, ?)');
                        stmt.run(fullID, dateMatch, selectedFilePath, joulesValue);
                        console.log('Data successfully saved to database');
                        MainWindow.webContents.send('java-command-result', { success: true, output: joulesLine });
                        //MainWindow.webContents.send('cf-calculation-result', {success: true, output: carbonFootprintOutput });
                    } catch (err) {
                        console.error('Error while inserting into database:', err.message); // Log the error message
                        MainWindow.webContents.send('java-command-result', { success: false, output: "Failed to save data to database." });
                        //MainWindow.webContents.send('cf-calculation-result', { success: false, output: "Failed to calculate carbon footprint." });
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
