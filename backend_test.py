#!/usr/bin/env python3
"""
Backend API Testing for Secure Image Transfer App
Tests all authentication and image management endpoints
"""

import requests
import json
import base64
import io
from PIL import Image
import os
import time

# Get backend URL from environment
BACKEND_URL = "https://spoiler-picvault.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_data = {
            "username": "testuser_secure_2024",
            "email": "testuser_secure_2024@example.com", 
            "password": "SecurePass123!"
        }
        self.uploaded_image_ids = []
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        status_symbol = "✅" if status else "❌"
        print(f"{status_symbol} {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def create_test_image(self, format="JPEG", size=(100, 100)):
        """Create a test image in memory"""
        img = Image.new('RGB', size, color='red')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format=format)
        img_buffer.seek(0)
        return img_buffer.getvalue()
    
    def create_large_test_image(self):
        """Create a large test image (>10MB)"""
        img = Image.new('RGB', (3000, 3000), color='blue')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='JPEG', quality=100)
        img_buffer.seek(0)
        return img_buffer.getvalue()
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            response = self.session.post(
                f"{self.base_url}/register",
                json=self.test_user_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    self.log_test("User Registration", True, f"User created: {data['user']['username']}")
                    return True
                else:
                    self.log_test("User Registration", False, "Missing access_token or user in response")
                    return False
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, try to login instead
                self.log_test("User Registration", True, "User already exists (expected)")
                return self.test_user_login()
            else:
                self.log_test("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        try:
            login_data = {
                "username": self.test_user_data["username"],
                "password": self.test_user_data["password"]
            }
            
            response = self.session.post(
                f"{self.base_url}/login",
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    self.log_test("User Login", True, f"Login successful for: {data['user']['username']}")
                    return True
                else:
                    self.log_test("User Login", False, "Missing access_token or user in response")
                    return False
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False
    
    def test_login_with_wrong_credentials(self):
        """Test login with incorrect credentials"""
        try:
            wrong_data = {
                "username": self.test_user_data["username"],
                "password": "wrongpassword"
            }
            
            response = self.session.post(
                f"{self.base_url}/login",
                json=wrong_data
            )
            
            if response.status_code == 401:
                self.log_test("Login with Wrong Credentials", True, "Correctly rejected invalid credentials")
                return True
            else:
                self.log_test("Login with Wrong Credentials", False, f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Login with Wrong Credentials", False, f"Exception: {str(e)}")
            return False
    
    def test_jwt_token_validation(self):
        """Test JWT token validation"""
        if not self.auth_token:
            self.log_test("JWT Token Validation", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/images", headers=headers)
            
            if response.status_code == 200:
                self.log_test("JWT Token Validation", True, "Token accepted for protected endpoint")
                return True
            else:
                self.log_test("JWT Token Validation", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("JWT Token Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_unauthorized_access(self):
        """Test access without authentication token"""
        try:
            response = self.session.get(f"{self.base_url}/images")
            
            if response.status_code == 401:
                self.log_test("Unauthorized Access Protection", True, "Correctly rejected request without token")
                return True
            else:
                self.log_test("Unauthorized Access Protection", False, f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Unauthorized Access Protection", False, f"Exception: {str(e)}")
            return False
    
    def test_image_upload_jpeg(self):
        """Test JPEG image upload"""
        if not self.auth_token:
            self.log_test("JPEG Image Upload", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            image_data = self.create_test_image("JPEG")
            
            files = {
                'file': ('test_image.jpg', image_data, 'image/jpeg')
            }
            data = {
                'caption': 'Test JPEG image',
                'is_private': False
            }
            
            response = self.session.post(
                f"{self.base_url}/images/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                if "id" in result and "image_data" in result:
                    self.uploaded_image_ids.append(result["id"])
                    self.log_test("JPEG Image Upload", True, f"Image uploaded with ID: {result['id']}")
                    return True
                else:
                    self.log_test("JPEG Image Upload", False, "Missing id or image_data in response")
                    return False
            else:
                self.log_test("JPEG Image Upload", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("JPEG Image Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_image_upload_png(self):
        """Test PNG image upload"""
        if not self.auth_token:
            self.log_test("PNG Image Upload", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            image_data = self.create_test_image("PNG")
            
            files = {
                'file': ('test_image.png', image_data, 'image/png')
            }
            data = {
                'caption': 'Test PNG image',
                'is_private': True
            }
            
            response = self.session.post(
                f"{self.base_url}/images/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                if "id" in result and "image_data" in result:
                    self.uploaded_image_ids.append(result["id"])
                    self.log_test("PNG Image Upload", True, f"Private PNG uploaded with ID: {result['id']}")
                    return True
                else:
                    self.log_test("PNG Image Upload", False, "Missing id or image_data in response")
                    return False
            else:
                self.log_test("PNG Image Upload", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("PNG Image Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_image_upload_webp(self):
        """Test WebP image upload"""
        if not self.auth_token:
            self.log_test("WebP Image Upload", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            image_data = self.create_test_image("WEBP")
            
            files = {
                'file': ('test_image.webp', image_data, 'image/webp')
            }
            data = {
                'caption': 'Test WebP image',
                'is_private': False
            }
            
            response = self.session.post(
                f"{self.base_url}/images/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                if "id" in result and "image_data" in result:
                    self.uploaded_image_ids.append(result["id"])
                    self.log_test("WebP Image Upload", True, f"WebP uploaded with ID: {result['id']}")
                    return True
                else:
                    self.log_test("WebP Image Upload", False, "Missing id or image_data in response")
                    return False
            else:
                self.log_test("WebP Image Upload", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("WebP Image Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_invalid_file_type_upload(self):
        """Test upload with invalid file type"""
        if not self.auth_token:
            self.log_test("Invalid File Type Upload", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            files = {
                'file': ('test_file.txt', b'This is not an image', 'text/plain')
            }
            data = {
                'caption': 'Test invalid file',
                'is_private': False
            }
            
            response = self.session.post(
                f"{self.base_url}/images/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 400:
                self.log_test("Invalid File Type Upload", True, "Correctly rejected invalid file type")
                return True
            else:
                self.log_test("Invalid File Type Upload", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid File Type Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_large_file_upload(self):
        """Test upload with file size > 10MB"""
        if not self.auth_token:
            self.log_test("Large File Upload", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            large_image_data = self.create_large_test_image()
            
            files = {
                'file': ('large_image.jpg', large_image_data, 'image/jpeg')
            }
            data = {
                'caption': 'Large test image',
                'is_private': False
            }
            
            response = self.session.post(
                f"{self.base_url}/images/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 400 and "too large" in response.text.lower():
                self.log_test("Large File Upload", True, "Correctly rejected file > 10MB")
                return True
            else:
                self.log_test("Large File Upload", False, f"Expected 400 with 'too large', got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Large File Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_get_all_images(self):
        """Test retrieving all user images"""
        if not self.auth_token:
            self.log_test("Get All Images", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/images", headers=headers)
            
            if response.status_code == 200:
                images = response.json()
                if isinstance(images, list):
                    self.log_test("Get All Images", True, f"Retrieved {len(images)} images")
                    return True
                else:
                    self.log_test("Get All Images", False, "Response is not a list")
                    return False
            else:
                self.log_test("Get All Images", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get All Images", False, f"Exception: {str(e)}")
            return False
    
    def test_get_private_images(self):
        """Test retrieving only private images"""
        if not self.auth_token:
            self.log_test("Get Private Images", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/images?private=true", headers=headers)
            
            if response.status_code == 200:
                images = response.json()
                if isinstance(images, list):
                    # Check if all returned images are private
                    all_private = all(img.get("is_private", False) for img in images)
                    if all_private or len(images) == 0:
                        self.log_test("Get Private Images", True, f"Retrieved {len(images)} private images")
                        return True
                    else:
                        self.log_test("Get Private Images", False, "Some returned images are not private")
                        return False
                else:
                    self.log_test("Get Private Images", False, "Response is not a list")
                    return False
            else:
                self.log_test("Get Private Images", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Private Images", False, f"Exception: {str(e)}")
            return False
    
    def test_get_public_images(self):
        """Test retrieving only public images"""
        if not self.auth_token:
            self.log_test("Get Public Images", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/images?private=false", headers=headers)
            
            if response.status_code == 200:
                images = response.json()
                if isinstance(images, list):
                    # Check if all returned images are public
                    all_public = all(not img.get("is_private", True) for img in images)
                    if all_public or len(images) == 0:
                        self.log_test("Get Public Images", True, f"Retrieved {len(images)} public images")
                        return True
                    else:
                        self.log_test("Get Public Images", False, "Some returned images are not public")
                        return False
                else:
                    self.log_test("Get Public Images", False, "Response is not a list")
                    return False
            else:
                self.log_test("Get Public Images", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Public Images", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_image(self):
        """Test deleting an image"""
        if not self.auth_token:
            self.log_test("Delete Image", False, "No auth token available")
            return False
            
        if not self.uploaded_image_ids:
            self.log_test("Delete Image", False, "No uploaded images to delete")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            image_id = self.uploaded_image_ids[0]
            
            response = self.session.delete(f"{self.base_url}/images/{image_id}", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.uploaded_image_ids.remove(image_id)
                    self.log_test("Delete Image", True, f"Image {image_id} deleted successfully")
                    return True
                else:
                    self.log_test("Delete Image", False, "Missing message in response")
                    return False
            else:
                self.log_test("Delete Image", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Delete Image", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_nonexistent_image(self):
        """Test deleting a non-existent image"""
        if not self.auth_token:
            self.log_test("Delete Non-existent Image", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            fake_id = "non-existent-image-id"
            
            response = self.session.delete(f"{self.base_url}/images/{fake_id}", headers=headers)
            
            if response.status_code == 404:
                self.log_test("Delete Non-existent Image", True, "Correctly returned 404 for non-existent image")
                return True
            else:
                self.log_test("Delete Non-existent Image", False, f"Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Delete Non-existent Image", False, f"Exception: {str(e)}")
            return False
    
    def test_base64_encoding(self):
        """Test that uploaded images are properly base64 encoded"""
        if not self.auth_token:
            self.log_test("Base64 Encoding", False, "No auth token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/images", headers=headers)
            
            if response.status_code == 200:
                images = response.json()
                if images:
                    # Check first image's base64 data
                    first_image = images[0]
                    if "image_data" in first_image:
                        try:
                            # Try to decode base64 data
                            base64.b64decode(first_image["image_data"])
                            self.log_test("Base64 Encoding", True, "Image data is properly base64 encoded")
                            return True
                        except Exception:
                            self.log_test("Base64 Encoding", False, "Image data is not valid base64")
                            return False
                    else:
                        self.log_test("Base64 Encoding", False, "No image_data field in response")
                        return False
                else:
                    self.log_test("Base64 Encoding", True, "No images to test (but endpoint works)")
                    return True
            else:
                self.log_test("Base64 Encoding", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Base64 Encoding", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Secure Image Transfer App")
        print("=" * 60)
        
        test_results = []
        
        # Authentication Tests
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        test_results.append(self.test_user_registration())
        test_results.append(self.test_user_login())
        test_results.append(self.test_login_with_wrong_credentials())
        test_results.append(self.test_jwt_token_validation())
        test_results.append(self.test_unauthorized_access())
        
        # Image Upload Tests
        print("📤 IMAGE UPLOAD TESTS")
        print("-" * 30)
        test_results.append(self.test_image_upload_jpeg())
        test_results.append(self.test_image_upload_png())
        test_results.append(self.test_image_upload_webp())
        test_results.append(self.test_invalid_file_type_upload())
        test_results.append(self.test_large_file_upload())
        
        # Image Retrieval Tests
        print("📥 IMAGE RETRIEVAL TESTS")
        print("-" * 30)
        test_results.append(self.test_get_all_images())
        test_results.append(self.test_get_private_images())
        test_results.append(self.test_get_public_images())
        test_results.append(self.test_base64_encoding())
        
        # Image Management Tests
        print("🗑️ IMAGE MANAGEMENT TESTS")
        print("-" * 30)
        test_results.append(self.test_delete_image())
        test_results.append(self.test_delete_nonexistent_image())
        
        # Summary
        print("📊 TEST SUMMARY")
        print("=" * 60)
        passed = sum(test_results)
        total = len(test_results)
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
        else:
            print("⚠️ Some tests failed. Please check the details above.")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)