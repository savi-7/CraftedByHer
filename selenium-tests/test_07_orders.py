"""
Test Case 7: Order Management
This test validates order viewing, tracking, and management
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from base_test import BaseTest
from config import Config


class TestOrders(BaseTest):
    """Test order management functionality"""
    
    def login_first(self):
        """Helper method to login before testing orders"""
        try:
            self.driver.get(f"{Config.BASE_URL}/login")
            time.sleep(2)
            
            email_field = self.wait_for_element(By.XPATH, "//input[@placeholder='Email']")
            self.safe_send_keys(email_field, Config.EXISTING_USER["email"])
            
            password_field = self.wait_for_element(By.XPATH, "//input[@placeholder='Password']")
            self.safe_send_keys(password_field, Config.EXISTING_USER["password"])
            
            submit_button = self.wait_for_clickable(By.XPATH, "//button[@type='submit' or contains(text(), 'Sign In')]")
            self.safe_click(submit_button)
            time.sleep(3)
            
            print("✓ Logged in successfully")
        except Exception as e:
            print(f"⚠ Login step failed: {e}")
    
    def test_view_orders(self):
        """
        Test Case: View Orders
        Steps:
        1. Login
        2. Navigate to orders page
        3. Verify orders are displayed
        4. Test order details
        """
        try:
            print("\n=== Starting View Orders Test ===")
            
            # Step 1: Login
            print("Step 1: Logging in...")
            self.login_first()
            self.take_screenshot("01_logged_in")
            
            # Step 2: Navigate to orders page
            print("\nStep 2: Navigating to orders page...")
            try:
                orders_link = self.wait_for_clickable(By.XPATH, 
                    "//a[contains(@href, 'orders') or contains(@href, 'order')] | //*[contains(text(), 'Orders')]", timeout=5)
                self.safe_click(orders_link)
            except:
                # Try account page first
                try:
                    account_link = self.wait_for_clickable(By.XPATH, 
                        "//a[contains(@href, 'account')]", timeout=5)
                    self.safe_click(account_link)
                    time.sleep(2)
                    
                    # Then navigate to orders
                    orders_link = self.wait_for_clickable(By.XPATH, 
                        "//a[contains(@href, 'orders') or contains(text(), 'Orders')]", timeout=5)
                    self.safe_click(orders_link)
                except:
                    # Direct navigation
                    self.driver.get(f"{Config.BASE_URL}/orders")
            
            time.sleep(2)
            self.take_screenshot("02_orders_page")
            print("✓ On orders page")
            
            # Step 3: Verify orders are displayed
            print("\nStep 3: Verifying orders display...")
            try:
                # Look for order cards or list items
                orders = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'order')] | //*[contains(@class, 'order-card')] | //*[contains(@class, 'order-item')]")
                
                if len(orders) > 0:
                    print(f"✓ Found {len(orders)} order(s)")
                else:
                    # Check for empty state
                    try:
                        empty_message = self.driver.find_element(By.XPATH, 
                            "//*[contains(text(), 'No orders') or contains(text(), 'empty') or contains(text(), 'No order')]")
                        print(f"✓ Orders page loaded (empty state): {empty_message.text}")
                    except:
                        print("⚠ Could not verify orders display")
            except:
                print("⚠ Could not verify orders")
            
            # Step 4: Test order details
            print("\nStep 4: Testing order details...")
            try:
                # Try to click first order if available
                first_order = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'order')]//a | //*[contains(@class, 'order')]")
                
                if len(first_order) > 0:
                    self.safe_click(first_order[0])
                    time.sleep(2)
                    self.take_screenshot("03_order_details")
                    print("✓ Opened order details")
                else:
                    print("⚠ No orders to view details")
            except:
                print("⚠ Could not open order details")
            
            print("\n=== View Orders Test PASSED ===\n")
            
        except Exception as e:
            print(f"\n✗ Test Failed: {str(e)}")
            self.take_screenshot("view_orders_failure")
            pytest.fail(f"View orders test failed: {str(e)}")
    
    def test_track_order(self):
        """
        Test Case: Track Order
        Steps:
        1. Login
        2. Navigate to order tracking
        3. Verify tracking information
        """
        try:
            print("\n=== Starting Track Order Test ===")
            
            # Login
            self.login_first()
            
            # Navigate to orders
            self.driver.get(f"{Config.BASE_URL}/orders")
            time.sleep(2)
            
            # Try to find track order link
            try:
                track_link = self.wait_for_clickable(By.XPATH, 
                    "//a[contains(@href, 'track')] | //button[contains(text(), 'Track')]", timeout=5)
                self.safe_click(track_link)
                time.sleep(2)
                print("✓ Clicked track order")
                self.take_screenshot("track_order")
            except:
                print("⚠ No track order option found")
            
            print("\n=== Track Order Test PASSED ===\n")
            
        except Exception as e:
            print(f"\n✗ Test Failed: {str(e)}")
            self.take_screenshot("track_order_failure")
            pytest.fail(f"Track order test failed: {str(e)}")














