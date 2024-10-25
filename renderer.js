const buttonCreated = document.getElementById('upload');
const outputDiv = document.getElementById('output');

buttonCreated.addEventListener('click', function(event){
    //sends to main process
    window.ipc.send('open-file-dialog');
});

window.ipc.on('send-selected-file', function(event, path){
    outputDiv.textContent = `Selected File: ${path}\n\nRunning command...\n`;
});

window.ipc.on('java-command-output', function (event, data) {
    // Display messages based on their type
    if (data.type === 'info') {
        outputDiv.textContent += 'INFO: ' + data.message + '\n';
    } else if (data.type === 'error') {
        outputDiv.textContent += 'ERROR: ' + data.message + '\n';
    }
});

window.ipc.on('java-command-finished', function (event, result) {
    if (result.success) {
        outputDiv.textContent = result.output; // Display only the joules line
    } else {
        outputDiv.textContent = 'Java command failed to execute.';
    }
});