"""
Comprehensive Test Runner for Foodily App
This script runs all Selenium tests and generates a comprehensive report
"""
import subprocess
import sys
import os
from datetime import datetime

def main():
    """Run all tests and generate report"""
    print("=" * 60)
    print("Foodily App - Comprehensive Selenium Test Suite")
    print("=" * 60)
    print(f"Test Run Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Ensure directories exist
    os.makedirs("reports", exist_ok=True)
    os.makedirs("screenshots", exist_ok=True)
    
    # Run pytest with all test files
    test_files = [
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
    
    # Build pytest command
    cmd = [
        "pytest",
        "-v",
        "--html=reports/test_report.html",
        "--self-contained-html",
        "--tb=short",
        "-p", "no:warnings",
    ]
    
    # Add all test files
    cmd.extend(test_files)
    
    print("Running tests...")
    print()
    
    # Run tests
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    
    print()
    print("=" * 60)
    print(f"Test Run Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()
    print("Test report generated at: reports/test_report.html")
    print("Screenshots saved in: screenshots/")
    print()
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())














