async function getCarbonFootprint(carbonIntensity, joules) {
    const kWh = joules/3600000;
    const carbonFootprint = (kWh*carbonIntensity).toFixed(6);
    return carbonFootprint;
}

//code to calculate total daily carbon footprint
const db = require('better-sqlite3')('energy_measurement.db');
const today = new Date();
const day = String(today.getDate()).padStart(2, '0');
const month = String(today.getMonth() + 1).padStart(2, '0');
const year = today.getFullYear();
const formattedDate = `${day}/${month}/${year} `;

function getCarbonFootprintSum(date) {
    
  const stmt = db.prepare(`
    SELECT SUM(CAST(carbonFootprint AS REAL)) AS daily_carbon_footprint
    FROM measurements_data
    WHERE date like ?
  `);

  const result = stmt.get(formattedDate);
  return result.daily_carbon_footprint || 0;  // Return 0 if no records found
}

const totalFootprint = getCarbonFootprintSum(formattedDate);
console.log(`Total Carbon Footprint for ${formattedDate}: ${totalFootprint} grams of Carbon Dioxide`);

module.exports = getCarbonFootprint;