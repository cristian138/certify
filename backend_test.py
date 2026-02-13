import requests
import sys
import json
import tempfile
import os
from datetime import datetime
from io import BytesIO
from PIL import Image

class CertifyProAPITester:
    def __init__(self, base_url="https://certgen-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.template_id = None
        self.certificate_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    headers.pop('Content-Type', None)  # Let requests handle multipart
                    response = requests.post(url, headers=headers, files=files, data=data)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            print(f"   Status: {response.status_code} (expected {expected_status})")
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No detail available')
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Exception: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        user_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": f"Test User {timestamp}",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   ✅ Got token: {self.token[:20]}...")
            print(f"   ✅ User ID: {self.user_data['id']}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing user"""
        if not self.user_data:
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPassword123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']  # Update token
            print(f"   ✅ Login successful with token: {self.token[:20]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "stats",
            200
        )
        
        if success:
            print(f"   ✅ Stats: {response.get('total_templates', 0)} templates, {response.get('total_certificates', 0)} certificates")
        return success

    def create_test_image(self):
        """Create a test template image"""
        img = Image.new('RGB', (1000, 707), color='white')
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        img.save(temp_file.name)
        return temp_file.name

    def test_create_template(self):
        """Test template creation with image upload"""
        image_path = self.create_test_image()
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': ('test_template.png', f, 'image/png')}
                data = {
                    'name': 'Test Certificate Template',
                    'description': 'Test template for automated testing',
                    'width': 1000,
                    'height': 707
                }
                
                success, response = self.run_test(
                    "Create Template",
                    "POST",
                    "templates",
                    200,
                    data=data,
                    files=files
                )
                
                if success and 'id' in response:
                    self.template_id = response['id']
                    print(f"   ✅ Created template ID: {self.template_id}")
                return success
                
        finally:
            os.unlink(image_path)

    def test_get_templates(self):
        """Test getting all templates"""
        success, response = self.run_test(
            "Get All Templates",
            "GET",
            "templates",
            200
        )
        
        if success:
            print(f"   ✅ Found {len(response)} templates")
        return success

    def test_get_template_by_id(self):
        """Test getting specific template"""
        if not self.template_id:
            print("❌ No template ID available")
            return False
            
        success, response = self.run_test(
            "Get Template by ID",
            "GET",
            f"templates/{self.template_id}",
            200
        )
        return success

    def test_update_template(self):
        """Test updating template with fields"""
        if not self.template_id:
            print("❌ No template ID available")
            return False
        
        # Add some test fields
        fields = [
            {
                "field_type": "participant_name",
                "x": 400,
                "y": 350,
                "width": 300,
                "height": 40,
                "font_size": 24,
                "font_color": "#000000"
            },
            {
                "field_type": "qr_code",
                "x": 800,
                "y": 550,
                "width": 150,
                "height": 150
            }
        ]
        
        update_data = {
            "name": "Updated Test Template",
            "fields": fields
        }
        
        success, response = self.run_test(
            "Update Template",
            "PUT",
            f"templates/{self.template_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   ✅ Updated template with {len(fields)} fields")
        return success

    def test_create_certificate(self):
        """Test individual certificate creation"""
        if not self.template_id:
            print("❌ No template ID available")
            return False
        
        cert_data = {
            "template_id": self.template_id,
            "participant_name": "Juan Pérez",
            "document_id": "12345678",
            "certifier_name": "Instituto de Certificaciones",
            "representative_name": "Dr. María González",
            "representative_name_2": "Ing. Carlos Rodríguez",
            "event_name": "Curso de Testing Automatizado",
            "course_name": "Testing con Python"
        }
        
        success, response = self.run_test(
            "Create Certificate",
            "POST",
            "certificates",
            200,
            data=cert_data
        )
        
        if success and 'id' in response:
            self.certificate_id = response['id']
            print(f"   ✅ Created certificate ID: {self.certificate_id}")
            print(f"   ✅ Unique code: {response.get('unique_code')}")
        return success

    def test_get_certificates(self):
        """Test getting all certificates"""
        success, response = self.run_test(
            "Get All Certificates",
            "GET",
            "certificates",
            200
        )
        
        if success:
            print(f"   ✅ Found {len(response)} certificates")
        return success

    def test_verify_certificate(self):
        """Test public certificate verification"""
        if not self.certificate_id:
            print("❌ No certificate ID available")
            return False
        
        # First get the certificate to find its unique code
        success, cert_response = self.run_test(
            "Get Certificate for Verification",
            "GET",
            f"certificates/{self.certificate_id}",
            200
        )
        
        if not success or 'unique_code' not in cert_response:
            print("❌ Could not get certificate unique code")
            return False
        
        unique_code = cert_response['unique_code']
        
        # Test verification (this is public, no auth needed)
        old_token = self.token
        self.token = None  # Remove auth for public endpoint
        
        success, response = self.run_test(
            "Verify Certificate (Public)",
            "GET",
            f"verify/{unique_code}",
            200
        )
        
        self.token = old_token  # Restore auth
        
        if success:
            print(f"   ✅ Verified certificate for: {response.get('participant_name')}")
        return success

    def test_get_users(self):
        """Test getting all users (admin only)"""
        success, response = self.run_test(
            "Get All Users (Admin)",
            "GET",
            "users",
            200
        )
        
        if success:
            print(f"   ✅ Found {len(response)} users")
        return success

def main():
    print("🚀 Starting CertifyPro API Tests")
    print("=" * 50)
    
    tester = CertifyProAPITester()
    
    # Authentication Tests
    print("\n📝 AUTHENTICATION TESTS")
    print("-" * 30)
    
    if not tester.test_user_registration():
        print("❌ Registration failed, stopping tests")
        return 1
    
    if not tester.test_user_login():
        print("❌ Login failed, stopping tests") 
        return 1
        
    if not tester.test_get_current_user():
        print("❌ Get current user failed")
        return 1
    
    # Dashboard Tests  
    print("\n📊 DASHBOARD TESTS")
    print("-" * 30)
    
    tester.test_get_stats()
    
    # Template Tests
    print("\n🎨 TEMPLATE TESTS")
    print("-" * 30)
    
    if not tester.test_create_template():
        print("❌ Template creation failed, stopping template tests")
    else:
        tester.test_get_templates()
        tester.test_get_template_by_id()
        tester.test_update_template()
    
    # Certificate Tests
    print("\n🏆 CERTIFICATE TESTS") 
    print("-" * 30)
    
    if tester.template_id:
        if tester.test_create_certificate():
            tester.test_get_certificates()
            tester.test_verify_certificate()
    else:
        print("❌ Skipping certificate tests - no template available")
    
    # User Management Tests
    print("\n👥 USER MANAGEMENT TESTS")
    print("-" * 30)
    
    tester.test_get_users()
    
    # Final Results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())