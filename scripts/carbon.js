// document.addEventListener("DOMContentLoaded", function() {
//     populateDropdown();
// });

// function populateDropdown() {
//     const url = 'https://api.electricitymap.org/v3/zones';

//     fetch(url)
//         .then(response => response.json())
//         .then(data => {
//             const dropdown = document.getElementById("country-select");

//             // Filter zones where countryName is "India"
//             const indiaZones = Object.entries(data).filter(
//                 ([zoneId, zone]) => zone.countryName === "India"
//             );

//             // Populate the dropdown
//             indiaZones.forEach(([zoneId, zone]) => {
//                 const option = document.createElement("option");
//                 option.value = zoneId; // Set value as the zone ID
//                 option.textContent = zone.zoneName;
//                 dropdown.appendChild(option);
//             });
//         })
//         .catch(error => {
//             console.error("Error fetching data:", error);
//         });
// }

// // Function to get the selected zone ID
// function getSelectedZoneId() {
//     const dropdown = document.getElementById("country-select");
//     const selectedZoneId = dropdown.value; // Get the value of the selected option
//     console.log("Selected Zone ID:", selectedZoneId);
//     return selectedZoneId;
// }

// // Example: Add an event listener to the dropdown to log the selected zone ID
// document.getElementById("country-select").addEventListener("change", getSelectedZoneId);

// function navigateTo(page) {
//     window.location.href = page; 
// }