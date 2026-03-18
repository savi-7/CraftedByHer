"""
Test Runner with Application Health Check
This script checks if the application is running before executing tests
"""
import sys
import subprocess
import requests
import time
from config import Config

def check_application_running():
    """Check if application is accessible"""
    print("=" * 60)
    print("Checking Application Status...")
    print("=" * 60)
    
    try:
        response = requests.get(Config.BASE_URL, timeout=5)
        if response.status_code == 200:
            print(f"[OK] Application is running at {Config.BASE_URL}")
            return True
        else:
            print(f"[WARNING] Application responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"[X] Application is NOT running at {Config.BASE_URL}")
        print("\n" + "=" * 60)
        print("Please start the application first:")
        print("=" * 60)
        print("\nOption 1: Use start script")
        print("  start-system.bat")
        print("\nOption 2: Start manually")
        print("  Terminal 1: cd server && npm start")
        print("  Terminal 2: cd client && npm run dev")
        print("\nThen wait a few seconds and run this script again.")
        print("=" * 60)
        return False
    except Exception as e:
        print(f"⚠️  Error checking application: {e}")
        return False

def main():
    """Main test runner"""
    print("\n" + "=" * 60)
    print("Foodily App - Selenium Test Suite")
    print("=" * 60 + "\n")
    
    # Check if application is running
    if not check_application_running():
        print("\n[X] Cannot run tests - application is not running")
        print("Please start the application and try again.\n")
        return 1
    
    print("\n" + "=" * 60)
    print("Running Tests...")
    print("=" * 60 + "\n")
    
    # Run pytest
    cmd = [
        sys.executable, "-m", "pytest",
        "-v",
        "--html=reports/test_report.html",
        "--self-contained-html",
        "--tb=short",
        "-p", "no:warnings",
    ]
    
    # Add all test files
    test_files = [
        "test_00_health_check.py",
        "test_01_registration.py",
        "test_02_login.py",
        "test_03_add_to_cart.py",
        "test_04_wishlist.py",
        "test_05_product_browsing.py",
        "test_06_checkout_payment.py",
        "test_07_orders.py",
        "test_08_user_profile.py",
        "test_09_forgot_password.py",
        "test_10_seller_dashboard.py",
        "test_11_admin_dashboard.py",
        "test_12_hub_manager.py",
        "test_13_home_page.py",
        "test_14_comprehensive_flow.py",
    ]
    
    cmd.extend(test_files)
    
    result = subprocess.run(cmd)
    
    print("\n" + "=" * 60)
    print("Test Execution Complete")
    print("=" * 60)
    print(f"\nTest report: reports/test_report.html")
    print(f"Screenshots: screenshots/\n")
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())

