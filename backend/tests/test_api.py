"""
Backend API tests for CertifyPro Digital Certificate System
Tests: Auth, Certificates, Batch PDF, Templates, Verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = "admin@jotuns.com"
TEST_PASSWORD = "admin123"


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestCertificates:
    """Certificate endpoint tests"""
    
    def test_get_certificates(self, auth_headers):
        """Test listing certificates"""
        response = requests.get(f"{API_URL}/certificates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have existing certificates
        assert len(data) > 0
        # Check certificate structure
        cert = data[0]
        assert "id" in cert
        assert "participant_name" in cert
        assert "unique_code" in cert
        assert "document_id" in cert
    
    def test_get_single_certificate(self, auth_headers):
        """Test getting a single certificate by ID"""
        # First get list
        list_response = requests.get(f"{API_URL}/certificates", headers=auth_headers)
        certs = list_response.json()
        if not certs:
            pytest.skip("No certificates to test")
        
        cert_id = certs[0]["id"]
        response = requests.get(f"{API_URL}/certificates/{cert_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == cert_id
    
    def test_certificate_download(self, auth_headers):
        """Test downloading a single certificate"""
        # Get a certificate ID
        list_response = requests.get(f"{API_URL}/certificates", headers=auth_headers)
        certs = list_response.json()
        if not certs:
            pytest.skip("No certificates to test")
        
        cert_id = certs[0]["id"]
        response = requests.get(f"{API_URL}/certificates/{cert_id}/download", headers=auth_headers)
        assert response.status_code == 200
        # Should return PNG image
        assert response.headers.get("content-type") == "image/png"


class TestBatchPdf:
    """Batch PDF endpoint tests"""
    
    def test_batch_pdf_download(self, auth_headers):
        """Test POST /api/certificates/batch-pdf endpoint"""
        # Get some certificate IDs
        list_response = requests.get(f"{API_URL}/certificates", headers=auth_headers)
        certs = list_response.json()
        if len(certs) < 2:
            pytest.skip("Need at least 2 certificates for batch PDF test")
        
        # Get first 2 certificate IDs
        cert_ids = [certs[0]["id"], certs[1]["id"]]
        
        # Test batch PDF endpoint
        response = requests.post(
            f"{API_URL}/certificates/batch-pdf",
            headers={**auth_headers, "Content-Type": "application/json"},
            json=cert_ids
        )
        
        assert response.status_code == 200, f"Batch PDF failed: {response.text}"
        # Should return PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF, got: {content_type}"
        # Should have content
        assert len(response.content) > 1000, "PDF content too small"
    
    def test_batch_pdf_empty_list(self, auth_headers):
        """Test batch PDF with empty list returns 400"""
        response = requests.post(
            f"{API_URL}/certificates/batch-pdf",
            headers={**auth_headers, "Content-Type": "application/json"},
            json=[]
        )
        assert response.status_code == 400
    
    def test_batch_pdf_invalid_ids(self, auth_headers):
        """Test batch PDF with invalid IDs returns 404"""
        response = requests.post(
            f"{API_URL}/certificates/batch-pdf",
            headers={**auth_headers, "Content-Type": "application/json"},
            json=["invalid-id-1", "invalid-id-2"]
        )
        assert response.status_code == 404


class TestTemplates:
    """Template endpoint tests"""
    
    def test_get_templates(self, auth_headers):
        """Test listing templates"""
        response = requests.get(f"{API_URL}/templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_single_template(self, auth_headers):
        """Test getting a single template"""
        list_response = requests.get(f"{API_URL}/templates", headers=auth_headers)
        templates = list_response.json()
        if not templates:
            pytest.skip("No templates to test")
        
        template_id = templates[0]["id"]
        response = requests.get(f"{API_URL}/templates/{template_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template_id


class TestVerification:
    """Public verification endpoint tests"""
    
    def test_verify_certificate_by_code(self, auth_headers):
        """Test public certificate verification"""
        # Get a certificate to verify
        list_response = requests.get(f"{API_URL}/certificates", headers=auth_headers)
        certs = list_response.json()
        if not certs:
            pytest.skip("No certificates to test")
        
        unique_code = certs[0]["unique_code"]
        # Public endpoint - no auth required
        response = requests.get(f"{API_URL}/verify/{unique_code}")
        assert response.status_code == 200
        data = response.json()
        assert data["unique_code"] == unique_code
    
    def test_verify_invalid_code(self):
        """Test verification with invalid code returns 404"""
        response = requests.get(f"{API_URL}/verify/INVALIDCODE123")
        assert response.status_code == 404


class TestStats:
    """Stats endpoint tests"""
    
    def test_get_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{API_URL}/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_templates" in data
        assert "total_certificates" in data
        assert "certificates_this_month" in data
        assert "total_validations" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
