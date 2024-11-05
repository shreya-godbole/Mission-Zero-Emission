const buttonCreated = document.getElementById('upload');
const outputDiv = document.getElementById('result'); 

buttonCreated.addEventListener('click', function(event){
    // Sends to main process
    window.ipc.send('open-file-dialog');
});

window.ipc.on('send-selected-file', function(event, path){
    outputDiv.textContent = `Selected File: ${path}\n\nRunning command...\n`;
});

window.ipc.on('java-command-result', function (event, result) {
    if (result.success) {
        // Display only the specific joules line output
        outputDiv.innerText = `Energy Consumption: ${result.output}`; // Use outputDiv here
    } else {
        // Display error if the command failed
        outputDiv.innerText = `Error: ${result.output}`; // Use outputDiv here
    }
    
});
