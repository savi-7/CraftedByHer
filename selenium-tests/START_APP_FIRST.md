# ⚠️ IMPORTANT: Start Application Before Running Tests

## The application must be running before executing Selenium tests!

### Quick Start:

1. **Start the Application:**
   ```bash
   # Option 1: Use the start script
   start-system.bat
   
   # Option 2: Start manually
   # Terminal 1 - Backend:
   cd server
   npm start
   
   # Terminal 2 - Frontend:
   cd client
   npm run dev
   ```

2. **Verify Application is Running:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000
   
   Open these URLs in your browser to confirm they're accessible.

3. **Then Run Tests:**
   ```bash
   cd selenium-tests
   run_tests_simple.bat
   ```

### What Happens if App is Not Running?

- Tests will fail with `ERR_CONNECTION_REFUSED`
- Health check test will skip with a helpful message
- You'll see clear error messages indicating the app needs to be started

### Troubleshooting:

- **Port 5173 already in use?** - Stop other applications using that port
- **Port 5000 already in use?** - Check if backend is already running
- **Tests still failing?** - Check that both frontend and backend are running














