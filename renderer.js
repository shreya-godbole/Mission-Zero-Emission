const buttonCreated = document.getElementById('upload');
const joulesOutputDiv = document.getElementById('result');
const cfOutputDiv = document.getElementById('cf-value');

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
        cfOutputDiv.textContent = `Carbon Footprint: ${data.output} grams`;
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

window.electronAPI.onPromptUseCase((fullID) => {
    console.log('Received fullID:', fullID); // Debugging line
    if (!fullID) {
        alert('Error: fullID is undefined.');
        return;
    }
    const useCase = prompt('Enter use-case for the selected file:');
    if (useCase) {
      window.electronAPI.sendUseCase(useCase, fullID); // Send useCase and fullID to the main process
    }
  });

document.addEventListener("DOMContentLoaded", function() {
    populateDropdown();
});

function populateDropdown() {
    const url = 'https://api.electricitymap.org/v3/zones';

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const dropdown = document.getElementById("country-select");

            // Filter zones where countryName is "India"
            const indiaZones = Object.entries(data).filter(
                ([zoneId, zone]) => zone.countryName === "India"
            );

            // Populate the dropdown
            indiaZones.forEach(([zoneId, zone]) => {
                const option = document.createElement("option");
                option.value = zoneId;
                option.textContent = zone.zoneName;
                dropdown.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
}

// Send selected zone ID to the main process
document.getElementById("country-select").addEventListener("change", () => {
    const selectedZoneId = document.getElementById("country-select").value;
    console.log(`Selected Zone ID: ${selectedZoneId}`);
    window.electronAPI.sendZoneSelected(selectedZoneId);
});

// Navigation function (optional, if needed for page navigation)
function navigateTo(page) {
    window.location.href = page;
}
