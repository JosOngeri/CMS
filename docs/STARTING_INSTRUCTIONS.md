# KMainCMS - Starting Instructions Manual

This guide provides step-by-step instructions to get the KMainCMS web application up and running.

## Prerequisites

- **Node.js**: Version 16.x or higher
- **PostgreSQL**: Version 13.x or higher
- **NPM**: Standard with Node.js
- **PM2** (Optional): For background process management (`npm install -g pm2`)

---

## 1. Database Setup

Ensure PostgreSQL is running on your machine.

1.  **Create the Database**:
    ```bash
    psql -U postgres -c "CREATE DATABASE kmaincms;"
    ```

2.  **Initialize Schema**:
    Navigate to the `database` directory and run the setup script:
    *   **Windows**:
        ```cmd
        cd database
        setup.bat
        ```
    *   **Linux/macOS**:
        ```bash
        cd database
        chmod +x setup.sh
        ./setup.sh
        ```

---

## 2. Backend Setup

1.  **Navigate to Backend**:
    ```bash
    cd backend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file based on `.env.example`:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and update the following:
    - `DATABASE_URL`: `postgresql://user:password@localhost:5432/kmaincms`
    - `JWT_SECRET`: A secure random string
    - `PORT`: Default is `5005`

4.  **Run Migrations/Seeds (if needed)**:
    ```bash
    node setup-database.js
    ```

---

## 3. Frontend Setup

1.  **Navigate to Frontend**:
    ```bash
    cd frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file (if required by your API settings):
    ```bash
    cp .env.example .env
    ```

---

## 4. Starting the Application

### Option A: Development Mode (Standard)

Open two terminals:

*   **Terminal 1 (Backend)**:
    ```bash
    cd backend
    npm run dev
    ```
*   **Terminal 2 (Frontend)**:
    ```bash
    cd frontend
    npm run dev
    ```

### Option B: Production/Background Mode (Using PM2)

From the project root:

1.  **Start All Services**:
    ```bash
    pm2 start backend/ecosystem.config.cjs
    # And for frontend (if configured in ecosystem) or manually:
    pm2 start "npm run dev" --name kmaincms-frontend --cwd ./frontend
    ```
    *(Note: If you already have processes configured, just use `pm2 start all`)*

2.  **Manage Processes**:
    - `pm2 list`: View status
    - `pm2 logs`: View logs
    - `pm2 stop all`: Stop all servers
    - `pm2 restart all`: Restart all servers
    - `pm2 kill`: Stop and remove the PM2 daemon

---

## 5. Accessing the App

- **Frontend**: [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal)
- **Backend API**: [http://localhost:5005/api](http://localhost:5005/api)

## Troubleshooting

- **Database Errors**: Verify your `DATABASE_URL` in `backend/.env` matches your local PostgreSQL credentials.
- **Port Conflicts**: If port 5005 or 5173 is in use, you can change them in `backend/.env` and `frontend/vite.config.js` respectively.
- **Node Version**: If you encounter dependency issues, ensure you are using a compatible Node.js version (LTS recommended).
