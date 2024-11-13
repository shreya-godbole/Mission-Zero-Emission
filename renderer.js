const buttonCreated = document.getElementById('upload');
const outputDiv = document.getElementById('result');

buttonCreated.addEventListener('click', function(event) {
    window.ipc.send('open-file-dialog');
});

window.ipc.on('send-selected-file', function(event, path) {
    outputDiv.textContent = `Selected File: ${path}\n\nRunning command...\n`;
});

window.ipc.on('java-command-result', function(event, data) {
    if (data.success) {
        outputDiv.textContent = `Energy Consumption: ${data.output}`;
    } else {
        outputDiv.textContent = `Error: ${data.output}`;
    }
});
