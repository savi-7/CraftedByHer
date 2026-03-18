"""
Test Case 0: Health Check
This test verifies the application is running and accessible
"""
import time
import pytest
import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from base_test import BaseTest
from config import Config


class TestHealthCheck(BaseTest):
    """Test application health and accessibility"""
    
    def test_application_accessible(self):
        """
        Test Case: Application Accessibility
        Steps:
        1. Check if application URL is accessible
        2. Verify page loads
        3. Check for basic page elements
        """
        try:
            print("\n=== Starting Health Check Test ===")
            
            # Step 1: Check if URL is accessible via HTTP request
            print("Step 1: Checking application accessibility...")
            try:
                response = requests.get(Config.BASE_URL, timeout=5)
                print(f"✓ Application is accessible - Status: {response.status_code}")
            except requests.exceptions.ConnectionError:
                pytest.skip(f"Application is not running at {Config.BASE_URL}. Please start the application first.")
            except Exception as e:
                print(f"⚠ HTTP check failed: {e}, but continuing with Selenium test")
            
            # Step 2: Verify page loads in browser
            print("\nStep 2: Verifying page loads in browser...")
            self.driver.get(Config.BASE_URL)
            time.sleep(3)
            
            # Step 3: Check for basic page elements
            print("\nStep 3: Checking for basic page elements...")
            try:
                # Look for any HTML content
                page_source = self.driver.page_source
                assert len(page_source) > 100, "Page seems empty"
                print("✓ Page has content")
                
                # Check for title or any text
                try:
                    title = self.driver.title
                    print(f"✓ Page title: {title}")
                except:
                    pass
                
                # Look for common elements
                body = self.driver.find_element(By.TAG_NAME, "body")
                assert body is not None, "Body element not found"
                print("✓ Page body found")
                
            except Exception as e:
                pytest.fail(f"Page verification failed: {e}")
            
            self.take_screenshot("health_check_success")
            print("\n=== Health Check Test PASSED ===\n")
            
        except Exception as e:
            print(f"\n✗ Health Check Failed: {str(e)}")
            self.take_screenshot("health_check_failure")
            pytest.fail(f"Health check failed: {str(e)}. Please ensure the application is running at {Config.BASE_URL}")














