const buttonCreated = document.getElementById('upload');
const joulesOutputDiv = document.getElementById('result');
const cfOutputDiv = document.getElementById('cfResult');

// Open file dialog when the button is clicked
buttonCreated.addEventListener('click', () => {
    window.electronAPI.sendOpenFileDialog();
});

// Display selected file path
window.electronAPI.onFileSelected((path) => {
    joulesOutputDiv.textContent = `Selected File: ${path}\n\nRunning command...`;
});

// Handle Java command result (energy consumption)
window.electronAPI.onJavaCommandResult((data) => {
    if (data.success) {
        joulesOutputDiv.textContent = `Energy Consumption: ${data.output}`;
    } else {
        joulesOutputDiv.textContent = `Error: ${data.output}`;
    }
});

// Handle carbon footprint calculation result
window.electronAPI.onCfCalculationResult((data) => {
    if (data.success) {
        cfOutputDiv.textContent = `Carbon Footprint: ${data.output}`;
    } else {
        cfOutputDiv.textContent = `Error: ${data.output}`;
    }
});

// Example of a general request-response communication
window.onload = function() {
    window.electronAPI.requestData('Hello from renderer.js');
    
    window.electronAPI.onSendResponse((data) => {
        console.log('Received response:', data);
    });
};

// Navigation function (optional, if needed for page navigation)
function navigateTo(page) {
    window.location.href = page;
}
