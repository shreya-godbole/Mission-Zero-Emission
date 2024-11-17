const axios = require('axios');

// Function to get carbon intensity
async function getCarbonIntensity(zone) {
    const apiUrl = `https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${zone}`;
    const apiToken = '3SSntUsg5z9g0'; 

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });

        // Extract carbon intensity value
        const carbonIntensity = response.data.carbonIntensity;
        //console.log(`Carbon Intensity for zone ${zone}: ${carbonIntensity}`);
        
        return carbonIntensity; // Use this value for your calculations
    } catch (error) {
        console.error('Error fetching carbon intensity:', error);
    }
}
module.exports = getCarbonIntensity;

