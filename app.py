from flask import Flask, jsonify , request , send_file
import sqlite3
import os
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np
import io


app = Flask(__name__)

# Path to the SQLite database file
DATABASE = 'energy_measurement.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/fetch-files', methods=['GET'])
def fetch_files():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT file FROM all_data')
    files = cursor.fetchall()
    return jsonify([file['file'] for file in files])

@app.route('/fetch-dates', methods=['GET'])
def fetch_dates():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT date FROM all_data')
    dates = cursor.fetchall()
    return jsonify([date['date'] for date in dates])

@app.route('/fetch-graph-data', methods=['GET'])
def fetch_graph_data():
    selected_file = request.args.get('file')
    selected_date = request.args.get('date')

    # Convert the date to DD/MM/YYYY format
    date_obj = datetime.strptime(selected_date, '%Y-%m-%d')
    formatted_date = date_obj.strftime('%d/%m/%Y')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT date, joules FROM all_data WHERE file=? AND date LIKE ?', (selected_file, formatted_date + '%'))
    data = cursor.fetchall()

    return jsonify([{'date': row[0], 'joules': row[1]} for row in data])

# Route to generate heatmap data based on file and date range
@app.route('/generate-heatmap', methods=['GET'])
def generate_heatmap():
    selected_file = request.args.get('file')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    if not selected_file or not start_date or not end_date:
        return jsonify({"error": "File name, start date, and end date are required"}), 400

    # Convert the date format to match the database format (DD/MM/YYYY)
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')  # Parsing input as YYYY-MM-DD
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')

        # Format dates as 'DD/MM/YYYY' for the query
        formatted_startdate = start_date_obj.strftime('%d/%m/%Y')
        formatted_enddate = end_date_obj.strftime('%d/%m/%Y')

        # Log the formatted dates
        print(f"Formatted start date: {formatted_startdate}, end date: {formatted_enddate}")
    except ValueError as e:
        return jsonify({"error": f"Invalid date format: {e}"}), 400

    # Connect to the database
    conn = get_db()
    cursor = conn.cursor()

    # Log the query
    query = '''
        SELECT date, joules 
        FROM all_data 
        WHERE file = ? AND date BETWEEN ? AND ?
    '''
    print(f"Executing query: {query} with params ({selected_file}, {formatted_startdate}, {formatted_enddate})")

    # Execute the query to fetch data based on date range
    cursor.execute(query, (selected_file, formatted_startdate, formatted_enddate))

    # Fetch results
    data = cursor.fetchall()

    # Log the fetched data
    print(f"Fetched data: {data}")

    # Check if data exists
    if not data:
        return jsonify({"message": "No data found for the selected range"}), 404

    # Return the data as JSON
    return jsonify([{'date': row[0], 'joules': row[1]} for row in data])

@app.route('/generate-zone-data', methods=['GET'])
def generate_zone_data():
    selected_file = request.args.get('file')

    if not selected_file:
        return jsonify({"error": "File name is required"}), 400

    # Connect to the database
    conn = get_db()
    cursor = conn.cursor()

    # Query to fetch zoneID and carbonFootprint
    query = '''
        SELECT zoneID, carbonFootprint 
        FROM measurements_data 
        WHERE file = ?
    '''
    cursor.execute(query, (selected_file,))
    data = cursor.fetchall()

    # Check if data exists
    if not data:
        return jsonify({"message": "No data found for the selected file"}), 404

    # Return data as JSON
    return jsonify([{'zoneID': row[0], 'carbonFootprint': row[1]} for row in data])


if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        conn = sqlite3.connect(DATABASE)
        conn.execute('CREATE TABLE all_data (id TEXT PRIMARY KEY, date TEXT, file TEXT, joules TEXT)')
        conn.close()
    app.run(debug=True, host='0.0.0.0', port=5000)

