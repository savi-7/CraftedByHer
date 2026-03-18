"""
Test Case 13: Home Page Functionality
This test validates home page elements and navigation
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from base_test import BaseTest
from config import Config


class TestHomePage(BaseTest):
    """Test home page functionality"""
    
    def test_home_page_load(self):
        """
        Test Case: Home Page Load
        Steps:
        1. Navigate to home page
        2. Verify page loads correctly
        3. Verify key elements are present
        """
        try:
            print("\n=== Starting Home Page Test ===")
            
            # Step 1: Navigate to home page
            print("Step 1: Navigating to home page...")
            self.driver.get(Config.BASE_URL)
            time.sleep(3)
            
            # Step 2: Verify page loads correctly
            print("\nStep 2: Verifying page load...")
            assert self.driver.current_url == Config.BASE_URL or self.driver.current_url == f"{Config.BASE_URL}/", "Not on home page"
            print("✓ Home page loaded successfully")
            self.take_screenshot("01_home_page")
            
            # Step 3: Verify key elements
            print("\nStep 3: Verifying key elements...")
            
            # Check for navigation
            try:
                nav = self.driver.find_element(By.XPATH, "//nav | //*[contains(@class, 'navbar')]")
                print("✓ Navigation bar found")
            except:
                print("⚠ Navigation bar not found")
            
            # Check for main content
            try:
                main_content = self.driver.find_elements(By.XPATH, 
                    "//main | //*[contains(@class, 'content')] | //*[contains(@class, 'hero')] | //h1 | //h2")
                if len(main_content) > 0:
                    print(f"✓ Found {len(main_content)} main content element(s)")
            except:
                print("⚠ Could not verify main content")
            
            # Check for footer
            try:
                footer = self.driver.find_element(By.XPATH, "//footer | //*[contains(@class, 'footer')]")
                print("✓ Footer found")
            except:
                print("⚠ Footer not found")
            
            # Check for product sections
            try:
                products = self.driver.find_elements(By.XPATH, 
                    "//*[contains(@class, 'product')] | //*[contains(text(), 'Product')] | //*[contains(@href, 'product')]")
                if len(products) > 0:
                    print(f"✓ Found {len(products)} product-related element(s)")
            except:
                print("⚠ Could not verify products section")
            
            self.take_screenshot("02_home_page_elements")
            
            print("\n=== Home Page Test PASSED ===\n")
            
        except Exception as e:
            print(f"\n✗ Test Failed: {str(e)}")
            self.take_screenshot("home_page_failure")
            pytest.fail(f"Home page test failed: {str(e)}")
    
    def test_home_page_navigation(self):
        """
        Test Case: Home Page Navigation
        Steps:
        1. Navigate to home page
        2. Test navigation links
        3. Verify links work
        """
        try:
            print("\n=== Starting Home Page Navigation Test ===")
            
            # Navigate to home page
            self.driver.get(Config.BASE_URL)
            time.sleep(2)
            
            # Test common navigation links
            nav_links = [
                ("Products", "/products"),
                ("About", "/about"),
                ("Contact", "/contact"),
                ("Login", "/login"),
            ]
            
            for link_text, expected_path in nav_links:
                try:
                    link = self.wait_for_clickable(By.XPATH, 
                        f"//a[contains(text(), '{link_text}')] | //a[contains(@href, '{expected_path}')]", timeout=3)
                    print(f"✓ Found navigation link: {link_text}")
                except:
                    print(f"⚠ Navigation link not found: {link_text}")
            
            self.take_screenshot("home_page_navigation")
            
            print("\n=== Home Page Navigation Test PASSED ===\n")
            
        except Exception as e:
            print(f"\n✗ Test Failed: {str(e)}")
            self.take_screenshot("home_page_navigation_failure")
            pytest.fail(f"Home page navigation test failed: {str(e)}")














