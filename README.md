# Goovlize

Goovlize is a web-based music streaming platform built with Node.js, Express, EJS, and MySQL. The application allows users to discover, stream, and manage music through a modern and responsive web interface.

---

## Features

* Music streaming and playback
* User authentication with Google OAuth
* Playlist management
* Music library management
* Search functionality
* Responsive user interface
* MySQL database integration

---

## Technologies Used

* Node.js
* Express.js
* MySQL 8
* EJS
* JavaScript
* HTML & CSS
* Google OAuth 2.0

---

## Requirements

Before running this project, make sure the following software is installed:

* Node.js
* MySQL 8
* npm (included with Node.js)

---

## Installation Guide

### 1. Clone Repository

```bash
git clone https://github.com/fhdyhdr/Goovlize.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and configure the required environment variables.

**Note:** The `.env` file is intentionally excluded from this repository for security reasons.

Example:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=goovlize
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_GOOVLIZE=goovlize
```

### 4. Configure Google OAuth

Create OAuth credentials in Google Cloud Console and update the following variables:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

Make sure the redirect URI matches your local or production environment.

### 5. Configure Database

Create a MySQL database named:

```txt
goovlize
```

Update the database credentials inside your `.env` file according to your environment.

### 6. Start Application

Run:

```bash
node app.js
```

or

```bash
npm start
```

### 7. Open Application

By default:

```txt
http://localhost:3000
```

---

## Important Notes

* This repository contains the application source code only.
* Environment configuration files (`.env`) are not included.
* Database schema and production credentials are not included for security reasons.
* Additional configuration may be required before the application can run successfully.
* Google OAuth credentials must be created and configured manually.

---

## Disclaimer

This repository is intended for source code sharing, portfolio demonstration, and educational purposes. Additional setup and configuration are required before deployment or production use.

---

## Author

Johan Tri Asmara
