const buttonCreated = document.getElementById('upload');
const outputDiv = document.getElementById('result'); 

buttonCreated.addEventListener('click', function(event){
    // Sends to main process
    window.ipc.send('open-file-dialog');
});

window.ipc.on('send-selected-file', function(event, path){
    outputDiv.textContent = `Selected File: ${path}\n\nRunning command...\n`;
});

window.ipc.on('java-command-result', function (event, data) {
    if (data.success) {
        document.getElementById('result').innerText = `Energy Consumption: ${data.output}`;
    } else {
        document.getElementById('result').innerText = `Error: ${data.output}`;
    }
});

const { insertValues, getValues } = require('./database');
insertValues(3.5);
console.log(getValues());