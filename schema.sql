CREATE DATABASE IF NOT EXISTS research_portal;
USE research_portal;
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
);

-- Sample listings (inserted only if the table is empty)
INSERT INTO research_opportunities
    (title, description, research_area, faculty_name, department, required_skills, available_positions, deadline, status)
SELECT * FROM (
    SELECT 'AI Research Assistant' AS title, 'Help train and evaluate machine learning models for image recognition.' AS description, 'Machine Learning' AS research_area, 'Dr. Ahmed Khan' AS faculty_name, 'Computer Science' AS department, 'Python, PyTorch, Statistics' AS required_skills, 2 AS available_positions, '2027-01-31' AS deadline, 'Open' AS status
    UNION ALL
    SELECT 'Network Security Analyst', 'Assist with penetration testing and intrusion detection research.', 'Cybersecurity', 'Dr. Sara Malik', 'Computer Science', 'Linux, Wireshark, Python', 1, '2027-02-15', 'Open'
    UNION ALL
    SELECT 'Renewable Energy Data Study', 'Analyse solar output datasets and build forecasting models.', 'Data Science', 'Dr. Bilal Hussain', 'Electrical Engineering', 'R, Excel, Statistics', 3, '2026-12-20', 'Closed'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM research_opportunities);
