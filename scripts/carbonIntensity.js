const axios = require('axios');

// Function to get carbon intensity
async function getCarbonIntensity(zone) {
    const apiUrl = `https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${zone}`;
    const apiToken = 'Pkq5pzdienfv1bhEDpUd';

    // Hardcoded values for zones other than IN-WE
    const hardcodedIntensities = {
        'IN': 665,
        'IN-NO': 560,
        'IN-NE': 442,
        'IN-SO': 180,
        'IN-EA': 574,
    };

    if (zone !== 'IN-WE') {
        return hardcodedIntensities[zone] || 999; // Default fallback value
    }

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'auth-token': apiToken
            }
        });

        const carbonIntensity = response.data.carbonIntensity;
        return carbonIntensity;
    } catch (error) {
        console.error('Error fetching carbon intensity:', error.response?.data || error.message);
    }
}

module.exports = getCarbonIntensity;
