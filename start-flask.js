const { spawn } = require('child_process');
const path = require('path');

function startFlaskServer() {
    const flaskPath = path.join(__dirname, 'app.py');
    const flaskProcess = spawn('python', [`"${flaskPath}"`], {
        shell: true,
        stdio: 'inherit', // Optional: to show Flask logs in Electron's console
    });

    flaskProcess.on('error', (error) => {
        console.error('Failed to start Flask server:', error);
    });

    flaskProcess.on('exit', (code) => {
        console.log('Flask server exited with code:', code);
    });

    return flaskProcess;
}

module.exports = { startFlaskServer };
