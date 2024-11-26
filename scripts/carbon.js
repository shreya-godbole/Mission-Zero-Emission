document.addEventListener("DOMContentLoaded", function() {
    populateDropdown();
});

function populateDropdown() {
    const url = 'https://api.electricitymap.org/v3/zones';

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const countryDropdown = document.getElementById("country-select");

            //Filter by countryName
            const uniqueCountries = [...new Set(
                Object.values(data)
                    .filter(zone => zone.countryName)
                    .map(zone => zone.countryName)
            )];

            // Populate the country dropdown
            uniqueCountries.forEach(country => {
                const option = document.createElement("option");
                option.value = country;
                option.textContent = country;
                countryDropdown.appendChild(option);
            });

            // Add event listener for country change
            countryDropdown.addEventListener("change", () => populateZoneDropdown(data));
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
}

// Populate zone dropdown based on the selected country
function populateZoneDropdown(data) {
    const selectedCountry = document.getElementById("country-select").value;
    const zoneDropdown = document.getElementById("zone-select");
    
    // Clear previous zone options
    zoneDropdown.innerHTML = '<option value="">Select a zone</option>';

    // Filter zones by the selected country
    const zonesInCountry = Object.entries(data).filter(
        ([zoneId, zone]) => zone.countryName === selectedCountry
    );

    // Populate the zone dropdown
    zonesInCountry.forEach(([zoneId, zone]) => {
        const option = document.createElement("option");
        option.value = zoneId;
        option.textContent = zone.zoneName;
        zoneDropdown.appendChild(option);
    });
}

// Function to get the selected zone ID
function getSelectedZoneId() {
    const dropdown = document.getElementById("zone-select");
    const selectedZoneId = dropdown.value; // Get the value of the selected option
    console.log("Selected Zone ID:", selectedZoneId);
    return selectedZoneId;
}

// Example: Add an event listener to the dropdown to log the selected zone ID
document.getElementById("zone-select").addEventListener("change", getSelectedZoneId);

function navigateTo(page) {
    window.location.href = page; 
}