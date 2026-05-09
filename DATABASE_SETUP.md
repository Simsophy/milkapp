# Database Setup Instructions

## Issues Found and Fixed

1. **API Error Display**: Fixed `display_errors` being enabled in `api.php`, which was causing PHP errors to be returned as HTML instead of JSON
2. **Database Schema**: The users table was missing the required columns (`username`, `phone`, `role`, `api_secret`)

## Setup Steps

### Option 1: Using MySQL Command Line

1. Open Windows Command Prompt or PowerShell
2. Run this command to connect to MySQL:
   ```bash
   mysql -u root -p
   ```
   (If no password is set, just press Enter when prompted)

3. Copy and paste the entire contents of `backend/database/setup.sql`:
   ```sql
   CREATE DATABASE IF NOT EXISTS milk_app;
   USE milk_app;
   DROP TABLE IF EXISTS users;
   CREATE TABLE users (
       id INT AUTO_INCREMENT PRIMARY KEY,
       username VARCHAR(255) NOT NULL UNIQUE,
       password VARCHAR(255) NOT NULL,
       email VARCHAR(255),
       phone VARCHAR(20),
       role VARCHAR(50) DEFAULT 'customer',
       api_secret VARCHAR(255),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   );
   CREATE INDEX idx_username ON users(username);
   CREATE INDEX idx_email ON users(email);
   ```

4. Type `exit;` to quit MySQL

### Option 2: Using phpMyAdmin

1. Open phpMyAdmin in your browser (usually http://localhost/phpmyadmin)
2. Create a new database named `milk_app`
3. Select the `milk_app` database
4. Go to the "SQL" tab
5. Paste the SQL from `backend/database/setup.sql`
6. Click "Go"

### Option 3: Using a Database Client

- Use any MySQL client (MySQL Workbench, DBeaver, etc.)
- Connect to your MySQL server
- Run the SQL script from `backend/database/setup.sql`

## After Setup

1. **Verify the setup**: Run `php backend/test_db.php` to confirm the database connection works
2. **Test registration**: Go to http://localhost:8000/register.html and create a new account
3. **Check browser console**: It should now show proper JSON responses instead of HTML errors

## Troubleshooting

### "Database connection failed" error
- Make sure MySQL is running
- Check that host is `localhost`, port is `3306`, username is `root`
- Verify the password (currently set to empty string in `backend/config/db.php`)

### "Unknown action" error
- Make sure your request includes `?action=register` or `?action=login`
- Check browser console to see the full request URL

### Still getting HTML errors
- Check `router.log` file in the project root for detailed error logs
- The display_errors setting has been fixed to prevent HTML leakage
