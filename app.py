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
    cursor.execute('SELECT DISTINCT file FROM mock_data')
    files = cursor.fetchall()
    return jsonify([file['file'] for file in files])

# @app.route('/fetch-runtimes', methods=['GET'])
# def fetch_runtimes():
#     conn = get_db()
#     cursor = conn.cursor()
#     cursor.execute('SELECT DISTINCT runtime FROM mock_data')
#     runtimes = [float(row['runtime']) for row in cursor.fetchall()]  # Convert to float
#     # Group runtimes into ranges (0-1, 1-2, ..., 4-5)
#     range_dict = {f"{i}-{i+1}": False for i in range(6)}  # Ranges up to 5
#     for runtime in runtimes:
#         range_key = f"{int(runtime)}-{int(runtime)+1}"
#         if range_key in range_dict:
#             range_dict[range_key] = True  # Mark as available if in range
#     available_ranges = [range_key for range_key, exists in range_dict.items() if exists]
#     return jsonify(available_ranges)

# @app.route('/fetch-usecases', methods=['GET'])
# def fetch_usecases():
#     conn = get_db()
#     cursor = conn.cursor()
#     cursor.execute('SELECT DISTINCT use_case FROM mock_data')
#     usecases = cursor.fetchall()
    
#     # Check if data exists
#     if not usecases:
#         return jsonify({"message": "No data found for the selected file"}), 404
    
#     return jsonify([usecase['use_case'] for usecase in usecases])
    
@app.route('/fetch-usecases', methods=['GET'])
def fetch_usecases():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT use_case FROM mock_data')
    usecases = cursor.fetchall()
    return jsonify([usecase['use_case'] for usecase in usecases]) 

@app.route('/fetch-graph-data', methods=['GET'])
def fetch_graph_data():
    selected_file = request.args.get('file')
    selected_date = request.args.get('date')

    # Convert the date to DD/MM/YYYY format
    date_obj = datetime.strptime(selected_date, '%Y-%m-%d')
    formatted_date = date_obj.strftime('%d/%m/%Y')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT date, joules FROM mock_data WHERE file=? AND date LIKE ?', (selected_file, formatted_date + '%'))
    data = cursor.fetchall()

    return jsonify([{'date': row[0], 'joules': row[1]} for row in data])

# Route to generate heatmap data based on file and date range
@app.route('/generate-heatmap', methods=['GET'])
def generate_heatmap():
    selected_file = request.args.get('file')
    start_date = request.args.get('startDate')  # Expected as 'YYYY-MM-DD'
    end_date = request.args.get('endDate')      # Expected as 'YYYY-MM-DD'

    if not selected_file or not start_date or not end_date:
        return jsonify({"error": "File name, start date, and end date are required"}), 400

    try:
        # Parse dates to validate their correctness
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError as e:
        return jsonify({"error": f"Invalid date format: {e}"}), 400

    conn = get_db()
    cursor = conn.cursor()

    query = '''
        SELECT date, joules
        FROM mock_data
        WHERE file = ? 
        AND DATE(substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2)) 
            BETWEEN DATE(?) AND DATE(?)
    '''

    cursor.execute(query, (selected_file, start_date, end_date))
    data = cursor.fetchall()

    if not data:
        return jsonify({"message": "No data found for the selected range"}), 404

    return jsonify([{'date': row[0], 'joules': row[1]} for row in data])

@app.route('/generate-heatmap-usecase', methods=['GET'])
def generate_heatmap_usecase():
    selected_usecase = request.args.get('usecase')
    selected_runtime_lower = request.args.get('runtime_lower')
    selected_runtime_upper = request.args.get('runtime_upper')

    if not selected_usecase or not selected_runtime_lower:
        return jsonify({"error": "Runtime and use-case are required"}), 400
    
    # Connect to the database
    conn = get_db()
    cursor = conn.cursor()

    # Log the query
    query = '''
        SELECT file, AVG(carbonFootprint) AS avg_carbon_footprint
        FROM mock_data 
        WHERE use_case = ? AND runtime BETWEEN ? AND ?
        GROUP BY file;
        '''
    print(f"Executing query: {query} with params ({selected_usecase}, {selected_runtime_lower}, {selected_runtime_upper})")

    # Execute the query to fetch data based on date range
    cursor.execute(query, (selected_usecase, selected_runtime_lower, selected_runtime_upper))

    # Fetch results
    results = cursor.fetchall()
    data = [{'file': row['file'], 'carbon_footprint': row['avg_carbon_footprint']} for row in results]

    # Log the fetched data
    print(f"Fetched data: {data}")

    # Check if data exists
    if not data:
        return jsonify({"message": "No data found for the selected range"}), 404

    return jsonify(data)

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
        SELECT zoneID, AVG(carbonFootprint)
        FROM mock_data 
        WHERE file = ?
        GROUP BY zoneID
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
        conn.execute('CREATE TABLE mock_data (id TEXT PRIMARY KEY, date TEXT, file TEXT, joules TEXT,zoneID TEXT,carbonFootprint TEXT,use_case TEXT)')
        conn.close()
    app.run(debug=True, host='0.0.0.0', port=5000)

