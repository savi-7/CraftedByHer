# How to Run Selenium Tests

## Prerequisites

1. **Application must be running**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

2. **Python 3.8+ installed**
   - Check with: `py --version`

3. **Dependencies installed**
   - Virtual environment created
   - Packages installed (selenium, pytest, etc.)

## Quick Start

### Step 1: Start the Application

```bash
# Option 1: Use start script
start-system.bat

# Option 2: Start manually
# Terminal 1 - Backend:
cd server
npm start

# Terminal 2 - Frontend:
cd client
npm run dev
```

### Step 2: Verify Application is Running

Open in browser:
- http://localhost:5173 (should show home page)
- http://localhost:5000 (backend should respond)

### Step 3: Run Tests

```bash
cd selenium-tests
run_tests_simple.bat
```

Or use Python directly:
```bash
cd selenium-tests
.\venv\Scripts\activate
py run_tests_with_check.py
```

## Test Files

All test files are in the `selenium-tests` directory:

- `test_00_health_check.py` - Verifies app is accessible
- `test_01_registration.py` - User registration
- `test_02_login.py` - User login
- `test_03_add_to_cart.py` - Add to cart
- `test_04_wishlist.py` - Wishlist functionality
- `test_05_product_browsing.py` - Product browsing
- `test_06_checkout_payment.py` - Checkout flow
- `test_07_orders.py` - Order management
- `test_08_user_profile.py` - User profile
- `test_09_forgot_password.py` - Forgot password
- `test_10_seller_dashboard.py` - Seller dashboard
- `test_11_admin_dashboard.py` - Admin dashboard
- `test_12_hub_manager.py` - Hub manager
- `test_13_home_page.py` - Home page
- `test_14_comprehensive_flow.py` - Complete flow

## Running Specific Tests

```bash
# Run single test file
py -m pytest test_02_login.py -v

# Run specific test
py -m pytest test_02_login.py::TestLogin::test_user_login -v

# Run with screenshots
py -m pytest -v --html=reports/test_report.html --self-contained-html
```

## Test Results

After running tests:
- **HTML Report**: `reports/test_report.html`
- **Screenshots**: `screenshots/` directory
- **Console Output**: Detailed execution logs

## Troubleshooting

### Application Not Running
- Error: `ERR_CONNECTION_REFUSED`
- Solution: Start the application first (see Step 1)

### ChromeDriver Issues
- Tests use `webdriver-manager` to auto-download ChromeDriver
- Ensure Chrome browser is installed
- Check internet connection for first-time download

### Tests Failing
1. Check screenshots in `screenshots/` directory
2. Review HTML report for detailed errors
3. Verify application is fully loaded
4. Check test credentials in `config.py`

### Timeout Issues
- Increase timeouts in `config.py`
- Check application performance
- Verify network connectivity

## Configuration

Edit `config.py` to customize:
- Application URL
- Test user credentials
- Timeout values
- Browser settings (headless mode)

## Notes

- Tests are designed to be non-destructive
- Some tests require valid user credentials
- Tests may take 5-10 minutes to complete
- Screenshots are captured on failures and key steps














