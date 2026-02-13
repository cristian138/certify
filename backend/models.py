from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    full_name: str
    role: str = "operator"  # admin or operator
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "operator"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    role: str
    created_at: datetime
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class FieldConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    field_type: str  # participant_name, document_id, certifier_name, representative_name, date, unique_code, qr_code
    x: float
    y: float
    width: float
    height: float
    font_family: str = "Arial"
    font_size: int = 14
    font_color: str = "#000000"
    text_align: str = "left"  # left, center, right

class Template(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    file_url: str  # Path to the template image/PDF
    file_type: str  # image or pdf
    width: float
    height: float
    fields: List[FieldConfig] = []
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    width: float
    height: float

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[List[FieldConfig]] = None

class Certificate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    unique_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    template_id: str
    participant_name: str
    document_id: str
    certifier_name: str
    representative_name: str
    representative_name_2: Optional[str] = None
    representative_name_3: Optional[str] = None
    issue_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_name: Optional[str] = None
    course_name: Optional[str] = None
    hash_code: Optional[str] = None  # SHA256 hash for integrity
    pdf_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    is_valid: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    validation_count: int = 0

class CertificateCreate(BaseModel):
    template_id: str
    participant_name: str
    document_id: str
    certifier_name: str
    representative_name: str
    representative_name_2: Optional[str] = None
    representative_name_3: Optional[str] = None
    event_name: Optional[str] = None
    course_name: Optional[str] = None

class CertificateBatchCreate(BaseModel):
    template_id: str
    event_name: Optional[str] = None
    course_name: Optional[str] = None

class CertificateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    unique_code: str
    template_id: str
    participant_name: str
    document_id: str
    certifier_name: str
    representative_name: str
    representative_name_2: Optional[str]
    issue_date: datetime
    event_name: Optional[str]
    course_name: Optional[str]
    pdf_url: Optional[str]
    is_valid: bool
    created_at: datetime
    validation_count: int

class CertificateValidation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    certificate_id: str
    validated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[Dict[str, Any]] = None

class StatsResponse(BaseModel):
    total_templates: int
    total_certificates: int
    certificates_this_month: int
    total_validations: int
    recent_certificates: List[CertificateResponse]
