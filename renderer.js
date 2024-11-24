const buttonCreated = document.getElementById('upload');
const joulesOutputDiv = document.getElementById('result');
const cfOutputDiv = document.getElementById('cfResult');

buttonCreated.addEventListener('click', function(event) {
    window.ipc.send('open-file-dialog');
});

window.ipc.on('send-selected-file', function(event, path) {
    joulesOutputDiv.textContent = `Selected File: ${path}\n\nRunning command...\n`;
});

window.ipc.on('java-command-result', function(event, data) {
    if (data.success) {
        joulesOutputDiv.textContent = `Energy Consumption: ${data.output}`;
    } else {
        joulesOutputDiv.textContent = `Error: ${data.output}`;
    }
});
window.ipc.on('cf-calculation-result', function(event, data) {
    if (data.success) {
        cfOutputDiv.textContent = `Carbon Footprint: ${data.output}`;
    } else {
        cfOutputDiv.textContent = `Error: ${data.output}`;
    }
});
  
window.onload = function() {
    // Example of sending a message to the main process
    ipcRenderer.send('request-data', 'Hello from renderer.js');
    
    ipcRenderer.on('send-response', (event, data) => {
        console.log('Received response:', data);
    });
};

// Define the navigateTo function
function navigateTo(page) {
    window.location.href = page;
}
