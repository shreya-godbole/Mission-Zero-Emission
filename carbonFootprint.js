async function getCarbonFootprint(carbonIntensity, joules) {
    const kWh = joules/3600000;
    const carbonFootprint = (kWh*carbonIntensity).toFixed(6);
    return carbonFootprint;
}
module.exports = getCarbonFootprint;