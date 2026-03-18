# Configuration file for Selenium tests
# This file contains all the configuration settings for the test suite

class Config:
    # Application URLs
    BASE_URL = "http://localhost:5173"  # Your React app URL (adjust if different)
    
    # Test User Credentials
    TEST_USER = {
        "name": "Manu",
        "email": "manu09@example.com",
        "password": "manu@123",
        "phone": "9876543210"
    }
    
    # Existing User for Login Test (you can change this to an existing user)
    EXISTING_USER = {
        "email": "saji@gmail.com",
        "password": "11223344"
    }
    
    # Seller User Credentials (optional - add if you have seller test account)
    SELLER_USER = {
        "email": "",  # Add seller email here
        "password": ""  # Add seller password here
    }
    
    # Admin User Credentials (optional - add if you have admin test account)
    ADMIN_USER = {
        "email": "",  # Add admin email here
        "password": ""  # Add admin password here
    }
    
    # Hub Manager User Credentials (optional - add if you have hub manager test account)
    HUB_MANAGER_USER = {
        "email": "",  # Add hub manager email here
        "password": ""  # Add hub manager password here
    }
    
    # Timeouts (in seconds)
    IMPLICIT_WAIT = 10
    EXPLICIT_WAIT = 15
    PAGE_LOAD_TIMEOUT = 30
    
    # Browser Settings
    HEADLESS = False  # Set to True to run tests without opening browser
    MAXIMIZE_WINDOW = True
    
    # Screenshot Settings
    SCREENSHOT_ON_FAILURE = True
    SCREENSHOT_DIR = "selenium-tests/screenshots"
    
    # Report Settings
    REPORT_DIR = "selenium-tests/reports"
    REPORT_TITLE = "Foodily App - Comprehensive Automation Test Report"


