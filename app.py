from flask import Flask, jsonify , request
import sqlite3
import os
from datetime import datetime


app = Flask(__name__)

# Path to the SQLite database file
DATABASE = 'measurements_data.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/fetch-files', methods=['GET'])
def fetch_files():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT file FROM measurements_data')
    files = cursor.fetchall()
    return jsonify([file['file'] for file in files])

@app.route('/fetch-dates', methods=['GET'])
def fetch_dates():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT date FROM measurements_data')
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
    cursor.execute('SELECT date, joules FROM measurements_data WHERE file=? AND date LIKE ?', (selected_file, formatted_date + '%'))
    data = cursor.fetchall()

    return jsonify([{'date': row[0], 'joules': row[1]} for row in data])



if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        conn = sqlite3.connect(DATABASE)
        conn.execute('CREATE TABLE measurements_data (id TEXT PRIMARY KEY, date TEXT, file TEXT, joules REAL)')
        conn.close()
    app.run(debug=True, host='0.0.0.0', port=5000)

