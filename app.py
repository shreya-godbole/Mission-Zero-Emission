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

@app.route('/fetch-runtimes', methods=['GET'])
def fetch_runtimes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT runtime FROM mock_data')
    runtimes = [float(row['runtime']) for row in cursor.fetchall()]  # Convert to float
    # Group runtimes into ranges (0-1, 1-2, ..., 4-5)
    range_dict = {f"{i}-{i+1}": False for i in range(6)}  # Ranges up to 5
    for runtime in runtimes:
        range_key = f"{int(runtime)}-{int(runtime)+1}"
        if range_key in range_dict:
            range_dict[range_key] = True  # Mark as available if in range
    available_ranges = [range_key for range_key, exists in range_dict.items() if exists]
    return jsonify(available_ranges)
    
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

@app.route('/fetch-usecases-file-specific', methods=['GET'])
def fetch_usecases_file_specific():
    selected_file = request.args.get('file')
    if not selected_file:
        return jsonify({"error": "File parameter is required."}), 400
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT use_case FROM mock_data WHERE file = ?', (selected_file,))
        usecases = cursor.fetchall()
        if not usecases:
            return jsonify({"message": "No use cases found for the given file."}), 404
        return jsonify([usecase[0] for usecase in usecases])
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/fetch-carbon-footprint', methods=['GET'])
def fetch_carbon_footprint():
    selected_file = request.args.get('file')  
    selected_usecase = request.args.get('usecase')  
    print(f"Selected file: {selected_file}, Selected use case: {selected_usecase}")
    if not selected_file:
        return jsonify({"error": "File parameter is required."}), 400
    if not selected_usecase:
        return jsonify({"error": "Use case parameter is required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT date, runtime, carbonFootprint FROM mock_data WHERE file=? AND use_case=?',
        (selected_file, selected_usecase)
    )
    data = cursor.fetchall()
    if not data:
        return jsonify({"message": "No data found for the given file and use case."}), 404

    return jsonify([
        {'date': row[0], 'runtime': row[1], 'carbonFootprint': row[2]} 
        for row in data
    ])

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


@app.route('/generate-heatmap-timeline', methods=['GET'])
def generate_heatmap_timeline():
    selected_file = request.args.get('file')
    selected_usecase = request.args.get('usecase')
    if not selected_file:
        return jsonify({"error": "File selection is required"}), 400
    if not selected_usecase:
        return jsonify({"error": "Usecase selection is required"}), 400
    
    # Connect to the database
    conn = get_db()
    cursor = conn.cursor()
    
    # SQL query to fetch data
    query = '''
        SELECT 
            strftime('%d', SUBSTR(date, 7, 4) || '-' || SUBSTR(date, 4, 2) || '-' || SUBSTR(date, 1, 2)) AS day,
            strftime('%m', SUBSTR(date, 7, 4) || '-' || SUBSTR(date, 4, 2) || '-' || SUBSTR(date, 1, 2)) AS month,
            strftime('%Y', SUBSTR(date, 7, 4) || '-' || SUBSTR(date, 4, 2) || '-' || SUBSTR(date, 1, 2)) AS year,
            SUM(carbonFootprint) AS carbon_footprint
        FROM 
            mock_data
        WHERE 
            file = ?  
        AND
            use_case = ?
        GROUP BY 
            year, month, day
        ORDER BY 
            year, month, day;
    '''
    
    print(f"Executing query: {query} with params ({selected_file, selected_usecase})")
    
    # Execute the query with the correct parameter format (tuple)
    cursor.execute(query, (selected_file, selected_usecase))  # Ensure a single-element tuple ends with a comma
    
    # Fetch results
    results = cursor.fetchall()
    
   # Convert the fetched data into a list of dictionaries
    data = [{'day': row['day'], 'month': row['month'], 'year': row['year'], 'carbon_footprint': row['carbon_footprint']} for row in results]
    
    if not data:
        return jsonify({"message": "No data found for the selected file"}), 404
    
    # Analyze the scope of the data (monthly or weekly)
    unique_months = {row['month'] for row in data}
    unique_years = {row['year'] for row in data}
    days_count = len(data)
    
    if len(unique_months) == 1 and len(unique_years) == 1:  # Data is for a single month
        if days_count > 7:  # Group by week
            data_by_week = {}
            for row in data:
                week_number = (int(row['day']) - 1) // 7 + 1
                key = f"Week {week_number}"
                if key not in data_by_week:
                    data_by_week[key] = 0
                data_by_week[key] += row['carbon_footprint']
            
            # Format weekly data for response
            weekly_data = [{'week': week, 'carbon_footprint': footprint} for week, footprint in data_by_week.items()]
            return jsonify({'view': 'weekly', 'data': weekly_data})
        else:  # Return daily data
            daily_data = [{'day': row['day'], 'carbon_footprint': row['carbon_footprint']} for row in data]
            return jsonify({'view': 'daily', 'data': daily_data})
    else:  # Data spans multiple months
        monthly_data = {}
        for row in data:
            key = f"{row['year']}-{row['month']}"
            if key not in monthly_data:
                monthly_data[key] = 0
            monthly_data[key] += row['carbon_footprint']
        
        formatted_monthly_data = [{'month': month, 'carbon_footprint': footprint} for month, footprint in monthly_data.items()]
        return jsonify({'view': 'monthly', 'data': formatted_monthly_data})



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

