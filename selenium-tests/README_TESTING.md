# Selenium Test Suite for Foodily App

This directory contains comprehensive Selenium tests for the Foodily application. The test suite covers all major functionalities without modifying any existing code.

## Test Coverage

### Authentication Tests
- **test_01_registration.py**: User registration flow
- **test_02_login.py**: User login functionality
- **test_09_forgot_password.py**: Forgot password flow

### Product Tests
- **test_05_product_browsing.py**: Product browsing, filtering, and search
- **test_03_add_to_cart.py**: Add products to cart
- **test_04_wishlist.py**: Add products to wishlist

### Shopping Tests
- **test_06_checkout_payment.py**: Checkout and payment flow
- **test_07_orders.py**: Order viewing and tracking

### User Management Tests
- **test_08_user_profile.py**: User profile and account management

### Dashboard Tests
- **test_10_seller_dashboard.py**: Seller dashboard functionality
- **test_11_admin_dashboard.py**: Admin dashboard functionality
- **test_12_hub_manager.py**: Hub manager login and dashboard

### UI Tests
- **test_13_home_page.py**: Home page elements and navigation
- **test_14_comprehensive_flow.py**: Complete user journey

## Setup

### Prerequisites
- Python 3.8 or higher
- Chrome browser installed
- Application running on `http://localhost:5173`

### Installation

1. Navigate to the selenium-tests directory:
```bash
cd selenium-tests
```

2. Create virtual environment (if not exists):
```bash
python -m venv venv
```

3. Activate virtual environment:
- Windows:
```bash
venv\Scripts\activate
```
- Linux/Mac:
```bash
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

Edit `config.py` to configure:
- `BASE_URL`: Your application URL (default: http://localhost:5173)
- `EXISTING_USER`: Test user credentials for login tests
- `TEST_USER`: Test user credentials for registration tests
- `SELLER_USER`: (Optional) Seller account credentials
- `ADMIN_USER`: (Optional) Admin account credentials
- `HUB_MANAGER_USER`: (Optional) Hub manager credentials
- `HEADLESS`: Set to `True` to run tests without opening browser

## Running Tests

### Run All Tests

**Windows:**
```bash
run_tests.bat
```

**Linux/Mac:**
```bash
./run_tests.sh
```

**Python:**
```bash
python run_all_tests.py
```

### Run Specific Test File
```bash
pytest test_02_login.py -v
```

### Run Specific Test Class
```bash
pytest test_02_login.py::TestLogin -v
```

### Run Specific Test Method
```bash
pytest test_02_login.py::TestLogin::test_user_login -v
```

### Run Tests with HTML Report
```bash
pytest -v --html=reports/test_report.html --self-contained-html
```

## Test Reports

After running tests, you can find:
- **HTML Report**: `reports/test_report.html`
- **Screenshots**: `screenshots/` directory (captured on failures and key steps)

## Test Structure

Each test file follows this structure:
1. **Setup**: Navigate to page, login if needed
2. **Action**: Perform the test actions
3. **Verification**: Verify expected results
4. **Screenshots**: Capture key steps

## Notes

- Tests are designed to be non-destructive and don't modify existing functionality
- Some tests may require specific user accounts (seller, admin, hub manager)
- Tests use implicit and explicit waits for better reliability
- Screenshots are automatically captured on failures
- All tests are independent and can be run in any order

## Troubleshooting

### ChromeDriver Issues
The tests use `webdriver-manager` to automatically download ChromeDriver. If you encounter issues:
1. Ensure Chrome browser is installed
2. Check your internet connection (for first-time driver download)
3. Update Chrome browser to latest version

### Timeout Issues
If tests timeout frequently:
1. Increase timeouts in `config.py`
2. Check if application is running and accessible
3. Verify network connectivity

### Element Not Found
If elements are not found:
1. Check if application UI has changed
2. Verify selectors in test files
3. Check screenshots in `screenshots/` directory

## Contributing

When adding new tests:
1. Follow existing test structure
2. Use helper methods from `BaseTest` class
3. Add appropriate screenshots
4. Update this README if adding new test categories














