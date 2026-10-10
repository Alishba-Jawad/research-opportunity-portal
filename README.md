# Research Opportunity Portal

A modern, full-stack platform engineered for academic institutions to advertise, discover, and oversee undergraduate research openings. Developed with a lightweight **Python (Flask)** backend, a robust **MySQL** relational database, and an intuitive, responsive **Vanilla JavaScript** frontend interface.

> **Course:** Computer Networks — Assignment 1  
> **Student:** Alishba Jawad  
> **Roll No:** 24P-0504  
> **Class:** BSCS-5B

---

## Demonstration Video

📹 The demonstration video is provided directly within the project submission files.

> **Implementation Note:** The web dashboard provides complete interactive capabilities to view, publish, edit, close, and remove opportunities directly through modal dialogs and dynamic controls. To comply with the strict one-minute video requirement, the demonstration walks through each endpoint using Postman to provide clear, real-time visibility into HTTP headers, payloads, and API status codes.

---

## Core Capabilities

- **Complete CRUD Operations** — Full lifecycle management (Create, Read, Update, Delete) via standardized RESTful endpoints.
- **Detailed Opportunity Modal** — Instant deep-dive view displaying comprehensive project descriptions, faculty supervisors, prerequisites, and seat availability.
- **One-Click Opportunity Closure** — Quick-action toggle to swiftly transition active listings from `Open` to `Closed` without full record editing.
- **Multi-Field Search & Dynamic Filtering** — Real-time filtering by keyword (title, domain, faculty mentor, or department) combined with status and department filter dropdowns.
- **Two-Layer Validation Strategy**:
  - **Client-Side (JavaScript)**: Immediate user feedback verifying required fields, positive position counts, and future deadline dates before dispatching requests.
  - **Server-Side (Flask)**: Strict schema validation validating JSON payloads, ISO 8601 date formatting, numeric bounds, and enum boundaries (`Open` / `Closed`).
- **Responsive & Modern UI** — Sleek dark-mode interface with handcrafted CSS styling, smooth transitions, custom modal interfaces, status tags, and adaptability across mobile, tablet, and desktop viewports.

---

## System Architecture & Technologies

| Layer                    | Technologies & Tools           | Purpose                                                            |
| :----------------------- | :----------------------------- | :----------------------------------------------------------------- |
| **Backend Service**      | Python 3, Flask, Flask-CORS    | REST API routing, request validation, and database operations      |
| **Data Persistence**     | MySQL / MariaDB                | Relational table schema with parameterized SQL execution           |
| **User Interface**       | HTML5, CSS3, Vanilla JS (ES6+) | Single-page application logic, dynamic DOM rendering, Fetch API    |
| **Environment & Config** | python-dotenv (`.env`)         | Secure management of local database credentials and server configs |

---

## System Prerequisites

Before launching the project, verify that your machine has the following tools installed:

- **Python 3.8+**
- **MySQL Server 5.7+** or **MariaDB 10.3+**
- **pip** (Python package installer)

---

## Installation & Setup Guide

### 1. Retrieve the Repository

```bash
git clone <repository-url>
cd research-opportunity-portal
```

### 2. Initialize the Database

Launch your MySQL client and execute the schema initialization script:

```bash
mysql -u root -p < schema.sql
```

_Alternatively, execute the contents of `schema.sql` directly inside MySQL Workbench or the MySQL command-line prompt. This establishes the `research_portal` database and provisions the `research_opportunities` table along with sample seed listings._

### 3. Set Up Environment Variables

Duplicate the template configuration file into an active `.env`:

```bash
cp .env.example .env
```

Open `.env` in any text editor and adjust your database connection parameters:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=research_portal
```

> 🔒 **Security Notice:** Do not commit `.env` into version control. It is explicitly tracked in `.gitignore` to prevent credential exposure.

### 4. Install Dependencies

Install all required Python packages via pip:

```bash
pip install -r requirements.txt
```

### 5. Start the Application Server

Start the Flask development server:

```bash
python app.py
```

### 6. Access the Web Dashboard

Open your web browser and navigate to:

```text
http://localhost:5000
```

You can access the portal dashboard directly at `http://localhost:5000`.

---

## Troubleshooting

| Problem | Fix |
| :------ | :-- |
| **"Could not connect to database"** | Make sure MySQL is running, then open `http://localhost:5000/api/health`. The message tells you if it is the host, the password (`.env`), or a missing database. The Flask terminal prints the full reason too. |
| **Old / different page appears** | An older copy of the app may still be running on port 5000. Stop it (Ctrl+C in its terminal), set `PORT=5001` in `.env`, or hard-refresh with `Ctrl+Shift+R`. |
| **No `.env` file** | Copy `.env.example` to `.env` (same folder as `app.py`) and set `DB_PASSWORD`. |

The app creates the `research_portal` database and table automatically on startup, so running `schema.sql` is optional (it also adds three sample listings).

---

## REST API Documentation

All application interactions adhere to REST conventions with structured JSON communication.

| Method   | Endpoint                  | Description                                               | Response Status |
| :------- | :------------------------ | :-------------------------------------------------------- | :-------------- |
| `GET`    | `/api/opportunities`      | Retrieve the complete list of research postings           | `200 OK`        |
| `GET`    | `/api/opportunities/<id>` | Fetch specific opportunity details by primary ID          | `200 OK`        |
| `POST`   | `/api/opportunities`      | Register and store a newly published research opportunity | `201 Created`   |
| `PUT`    | `/api/opportunities/<id>` | Update fields of an existing opportunity record           | `200 OK`        |
| `DELETE` | `/api/opportunities/<id>` | Permanently delete an opportunity from the system         | `200 OK`        |

### HTTP Status & Error Protocols

| Status Code        | Condition            | Explanation                                                                    |
| :----------------- | :------------------- | :----------------------------------------------------------------------------- |
| `200 OK`           | Request Succeeded    | Record retrieved, updated, or deleted as expected                              |
| `201 Created`      | Resource Provisioned | New research opportunity successfully stored in database                       |
| `400 Bad Request`  | Validation Failure   | Missing mandatory fields, invalid dates, negative positions, or malformed JSON |
| `404 Not Found`    | Target Missing       | No opportunity exists matching the requested ID                                |
| `500 Server Error` | Internal Exception   | Database connection failure or unhandled backend execution exception           |

---

## Repository Structure

```text
research-opportunity-portal/
├── app.py                  # Flask application server, route handlers, and API logic
├── schema.sql              # MySQL DDL table schema and initial demonstration records
├── requirements.txt        # Pinned Python package dependencies
├── .env.example            # Environment configuration template (safe for version control)
├── .env                    # Local environment credentials (excluded via .gitignore)
├── .gitignore              # Ignores local secrets, caches, and virtual environments
├── postman_collection.json # Ready-to-use Postman/Bruno API testing collection
├── README.md               # Complete project documentation and guide
└── frontend/
    ├── index.html          # Portal UI markup, cards layout, and modal dialogs
    ├── style.css           # Custom styling system, layout rules, and responsive queries
    └── script.js           # Client-side state handling, dynamic rendering, and API requests
```

---

## API Testing with Postman & Bruno

An exported testing suite is provided in the repository root:

📄 **`postman_collection.json`**

To verify all endpoints without the frontend:

1. Open **Postman** or **Bruno**.
2. Import `postman_collection.json`.
3. Execute the pre-configured requests (`GET`, `POST`, `PUT`, `DELETE`) against `http://localhost:5000`.

---

## Academic Notice & License

This project was built for academic evaluation under Computer Networks (Assignment 1). Distributed for academic and educational use.
