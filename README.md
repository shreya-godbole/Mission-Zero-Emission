# Mission Zero Emission

**Mission Zero Emission** is a cross-platform desktop application that enables real-time measurement, monitoring, and visualization of energy consumption and carbon footprint of software applications. Powered by [JoularJX](https://github.com/joular/joularjx), this tool empowers developers to understand and reduce the environmental impact of their software.

## Project Goals

- **Raise Awareness**: Highlight the energy usage and environmental footprint of everyday software.
- **Promote Sustainable Development**: Provide actionable insights that encourage greener coding practices.
- **Drive Optimization**: Enable developers to analyze and optimize the energy efficiency of their applications.

## Features

- **Real-Time Monitoring**  
  Measure the energy consumed by Java applications using JoularJX.

- **Carbon Footprint Calculation**  
  Calculate CO₂ emissions based on real-time regional electricity intensity data.

- **Interactive Dashboard**  
  Visualize energy and carbon data with clean, user-friendly graphs.

- **Historical Analysis**  
  Access and compare past measurements by file, use-case, runtime, and region.

- **Regional Comparisons**  
  Analyze differences in carbon footprint across different countries and electricity zones.

- **Scenario Simulations**  
  Model how changing execution environments affects sustainability metrics.

- **Optimization Guidance**  
  Help developers evaluate energy efficiency improvements and best practices.

## Tech Stack

- Electron JS — Desktop app framework  
- JoularJX — Energy measurement backend  
- SQLite — Local database for historical data  
- Java — Target language for monitored applications  
- Python + Flask — API integration (for carbon intensity and zone data)

## How It Works

1. Select a Java/JAR file.
2. Run the program via the dashboard — JoularJX tracks energy usage.
3. The app extracts energy data, timestamps, and calculates CO₂ emissions.
4. All results are saved locally and visualized via interactive graphs.

## Sample Use-Cases

- Compare energy and carbon cost of different features (e.g., video vs audio call).
- Evaluate performance optimizations not just for speed, but for sustainability.
- Demonstrate regional impact on CO₂ emissions (e.g., running code in India vs Norway).
## Prerequisites
- Install and set up JoularJX on your machine. (https://github.com/joular/joularjx)

## Installation & Setup

1. Clone this repository

2. Install dependencies:
   npm install

3. Configure paths in `config.ini`:
   [Paths]
   joularjx = path\to\joularjx
   java = path\to\java

4. Start the app:
   npm start



## Important Points:
1. The project is currently connected to a mock database for better visualtion and demo purposes.
2. The API calls are currently limited to regions within India, but can be modified to fetch the data for worldwide region-wise carbon intensity
