import os
import re
from pathlib import Path
from datetime import date, datetime

from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load .env from the SAME folder as app.py (works no matter which folder you
# run "python app.py" from -- the old version only worked from the project folder).
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

portal_app = Flask(__name__, static_folder="frontend", static_url_path="")
CORS(portal_app)

db_settings = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "research_portal"),
    "connection_timeout": 5,   # fail fast instead of hanging if MySQL is off
}

ALLOWED_STATUS_VALUES = ("Open", "Closed")

TEXT_FIELDS = [
    "title", "description", "research_area",
    "faculty_name", "department", "required_skills",
]

# Remembers the most recent connection problem so we can show a helpful hint.
last_db_error = None


# ──────────────────────────────────────────────────────────────
# Database helpers
# ──────────────────────────────────────────────────────────────
def explain_db_error(db_err):
    """Turns a MySQL error into a plain-English hint."""
    code = getattr(db_err, "errno", None)
    if code in (2003, 2002, 2005):
        return "MySQL is not running or the host/port is wrong. Start MySQL (XAMPP/WAMP/MySQL service) and check DB_HOST / DB_PORT."
    if code == 1045:
        return "Wrong MySQL username or password. Check DB_USER and DB_PASSWORD in your .env file."
    if code == 1049:
        return "The database does not exist yet. Run schema.sql, or restart the app (it creates the database automatically)."
    return "Check your .env settings and that MySQL is running."


def open_db_connection():
    """Returns a MySQL connection, or None if it fails (reason is printed)."""
    global last_db_error
    try:
        connection = mysql.connector.connect(**db_settings)
        last_db_error = None
        return connection
    except Error as db_err:
        last_db_error = db_err
        print(f"[DB] Connection error: {db_err}")
        print(f"[DB] Hint: {explain_db_error(db_err)}")
        return None


def db_unavailable_response():
    """Standard 500 response used when we cannot reach the database."""
    hint = explain_db_error(last_db_error) if last_db_error else "Check that MySQL is running."
    return jsonify({"error": f"Could not connect to database. {hint}"}), 500


def close_quietly(db_cursor, db_conn):
    """Closes cursor/connection without crashing if they were never opened."""
    if db_cursor is not None:
        db_cursor.close()
    if db_conn is not None:
        db_conn.close()


def setup_database():
    """Creates the database and table if they are missing (runs once on startup)."""
    db_name = db_settings["database"]
    if not re.fullmatch(r"[A-Za-z0-9_]+", db_name):
        print("[DB] DB_NAME may only contain letters, numbers and underscores.")
        return False

    try:
        # Connect WITHOUT choosing a database, so we can create it if needed.
        server_settings = {k: v for k, v in db_settings.items() if k != "database"}
        conn = mysql.connector.connect(**server_settings)
        cur = conn.cursor()
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cur.execute(f"USE `{db_name}`")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS research_opportunities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                research_area VARCHAR(100) NOT NULL,
                faculty_name VARCHAR(100) NOT NULL,
                department VARCHAR(100) NOT NULL,
                required_skills TEXT NOT NULL,
                available_positions INT NOT NULL,
                deadline DATE NOT NULL,
                status ENUM('Open', 'Closed') DEFAULT 'Open'
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
        print(f"[DB] Ready: database '{db_name}' and table 'research_opportunities' exist.")
        return True
    except Error as db_err:
        print(f"[DB] Setup failed: {db_err}")
        print(f"[DB] Hint: {explain_db_error(db_err)}")
        return False


# ──────────────────────────────────────────────────────────────
# Validation
# ──────────────────────────────────────────────────────────────
def check_request_data(payload):
    """Returns an error message string, or None if the data is valid."""
    if not isinstance(payload, dict):
        return "Request body must be a JSON object."

    mandatory_fields = TEXT_FIELDS + ["available_positions", "deadline"]

    for field_name in mandatory_fields:
        if field_name not in payload or payload[field_name] is None or str(payload[field_name]).strip() == "":
            return f"'{field_name}' is required and cannot be empty."

    try:
        if int(payload["available_positions"]) <= 0:
            return "'available_positions' must be a positive number."
    except (ValueError, TypeError):
        return "'available_positions' must be a valid number."

    try:
        datetime.strptime(str(payload["deadline"]).strip(), "%Y-%m-%d")
    except (ValueError, TypeError):
        return "'deadline' must be a valid date in YYYY-MM-DD format."

    current_status = payload.get("status") or "Open"
    if current_status not in ALLOWED_STATUS_VALUES:
        return f"'status' must be one of: {', '.join(ALLOWED_STATUS_VALUES)}."

    return None


def build_row_values(payload):
    """Returns the cleaned values (trimmed text) in the order the SQL expects."""
    values = [str(payload[name]).strip() for name in TEXT_FIELDS]
    values.append(int(payload["available_positions"]))
    values.append(str(payload["deadline"]).strip())
    values.append(payload.get("status") or "Open")
    return values


def make_json_safe(record):
    """MySQL returns dates as date objects; JSON needs plain text (YYYY-MM-DD)."""
    if isinstance(record.get("deadline"), date):
        record["deadline"] = record["deadline"].isoformat()
    return record


# ──────────────────────────────────────────────────────────────
# Page routes
# ──────────────────────────────────────────────────────────────
@portal_app.route("/")
@portal_app.route("/portal")
def show_home_page():
    return portal_app.send_static_file("index.html")


@portal_app.route("/welcome")
def welcome_redirect():
    return redirect("/", code=302)


@portal_app.route("/api/health", methods=["GET"])
def health_check():
    """Open http://localhost:5000/api/health to test the database connection."""
    db_conn = open_db_connection()
    if not db_conn:
        return db_unavailable_response()
    db_conn.close()
    return jsonify({"status": "ok", "database": db_settings["database"]}), 200


# ──────────────────────────────────────────────────────────────
# API routes
# ──────────────────────────────────────────────────────────────
@portal_app.route("/api/opportunities", methods=["POST"])
def add_opportunity():
    payload = request.get_json(silent=True)   # silent: bad JSON gives None instead of a crash

    if not payload:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    validation_error = check_request_data(payload)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    db_conn = open_db_connection()
    if not db_conn:
        return db_unavailable_response()

    db_cursor = None
    try:
        db_cursor = db_conn.cursor()
        insert_query = """
            INSERT INTO research_opportunities
                (title, description, research_area, faculty_name,
                 department, required_skills, available_positions, deadline, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        db_cursor.execute(insert_query, build_row_values(payload))
        db_conn.commit()

        return jsonify({
            "message": "Research opportunity created successfully.",
            "id": db_cursor.lastrowid
        }), 201

    except Error as db_err:
        return jsonify({"error": str(db_err)}), 500

    finally:
        close_quietly(db_cursor, db_conn)


@portal_app.route("/api/opportunities", methods=["GET"])
def list_opportunities():
    db_conn = open_db_connection()
    if not db_conn:
        return db_unavailable_response()

    db_cursor = None
    try:
        db_cursor = db_conn.cursor(dictionary=True)
        db_cursor.execute("SELECT * FROM research_opportunities ORDER BY id DESC")  # newest first
        all_records = [make_json_safe(r) for r in db_cursor.fetchall()]
        return jsonify(all_records), 200

    except Error as db_err:
        return jsonify({"error": str(db_err)}), 500

    finally:
        close_quietly(db_cursor, db_conn)


@portal_app.route("/api/opportunities/<int:opportunity_id>", methods=["GET"])
def fetch_single_opportunity(opportunity_id):
    db_conn = open_db_connection()
    if not db_conn:
        return db_unavailable_response()

    db_cursor = None
    try:
        db_cursor = db_conn.cursor(dictionary=True)
        db_cursor.execute(
            "SELECT * FROM research_opportunities WHERE id = %s", (opportunity_id,)
        )
        record = db_cursor.fetchone()

        if not record:
            return jsonify({"error": f"No opportunity found with ID {opportunity_id}."}), 404

        return jsonify(make_json_safe(record)), 200

    except Error as db_err:
        return jsonify({"error": str(db_err)}), 500

    finally:
        close_quietly(db_cursor, db_conn)


@portal_app.route("/api/opportunities/<int:opportunity_id>", methods=["PUT"])
def edit_opportunity(opportunity_id):
    payload = request.get_json(silent=True)

    if not payload:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    validation_error = check_request_data(payload)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    db_conn = open_db_connection()
    if not db_conn:
        return db_unavailable_response()

    db_cursor = None
    try:
        db_cursor = db_conn.cursor()

        db_cursor.execute(
            "SELECT id FROM research_opportunities WHERE id = %s", (opportunity_id,)
        )
        if not db_cursor.fetchone():
            return jsonify({"error": f"No opportunity found with ID {opportunity_id}."}), 404

        update_query = """
            UPDATE research_opportunities
            SET title = %s, description = %s, research_area = %s,
                faculty_name = %s, department = %s, required_skills = %s,
                available_positions = %s, deadline = %s, status = %s
            WHERE id = %s
        """
        db_cursor.execute(update_query, build_row_values(payload) + [opportunity_id])
        db_conn.commit()

        return jsonify({"message": f"Opportunity {opportunity_id} updated successfully."}), 200

    except Error as db_err:
        return jsonify({"error": str(db_err)}), 500

    finally:
        close_quietly(db_cursor, db_conn)


@portal_app.route("/api/opportunities/<int:opportunity_id>", methods=["DELETE"])
def remove_opportunity(opportunity_id):
    db_conn = open_db_connection()
    if not db_conn:
        return db_unavailable_response()

    db_cursor = None
    try:
        db_cursor = db_conn.cursor()

        db_cursor.execute(
            "SELECT id FROM research_opportunities WHERE id = %s", (opportunity_id,)
        )
        if not db_cursor.fetchone():
            return jsonify({"error": f"No opportunity found with ID {opportunity_id}."}), 404

        db_cursor.execute(
            "DELETE FROM research_opportunities WHERE id = %s", (opportunity_id,)
        )
        db_conn.commit()

        return jsonify({"message": f"Opportunity {opportunity_id} deleted successfully."}), 200

    except Error as db_err:
        return jsonify({"error": str(db_err)}), 500

    finally:
        close_quietly(db_cursor, db_conn)


# Friendly JSON for unknown API URLs (instead of an HTML 404 page)
@portal_app.errorhandler(404)
def not_found(_err):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Endpoint not found."}), 404
    return portal_app.send_static_file("index.html")


if __name__ == "__main__":
    setup_database()   # creates the database + table automatically if missing
    port = int(os.getenv("PORT", "5000"))
    print(f"[APP] Open http://localhost:{port}  (database check: http://localhost:{port}/api/health)")
    portal_app.run(debug=True, port=port)
