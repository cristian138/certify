from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
import shutil
import uuid
from PIL import Image, ImageDraw
from io import BytesIO
import base64
import openpyxl

from models import (
    User, UserCreate, UserLogin, UserResponse, TokenResponse,
    Template, TemplateCreate, TemplateUpdate,
    Certificate, CertificateCreate, CertificateBatchCreate, CertificateResponse,
    CertificateValidation, AuditLog, StatsResponse, FieldConfig
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role
)
from utils import generate_certificate_hash, generate_qr_code, get_font, hex_to_rgb

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create directories for uploads
UPLOAD_DIR = ROOT_DIR / "uploads"
TEMPLATES_DIR = UPLOAD_DIR / "templates"
CERTIFICATES_DIR = UPLOAD_DIR / "certificates"
QR_CODES_DIR = UPLOAD_DIR / "qr_codes"

for directory in [UPLOAD_DIR, TEMPLATES_DIR, CERTIFICATES_DIR, QR_CODES_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Create the main app
app = FastAPI(title="CertifyPro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Dependency to get database
async def get_db():
    return db

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, database: AsyncIOMotorDatabase = Depends(get_db)):
    # Check if user exists
    existing_user = await database.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role or "operator"
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await database.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    user_response = UserResponse(**user.model_dump())
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, database: AsyncIOMotorDatabase = Depends(get_db)):
    user_data = await database.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_data or not verify_password(credentials.password, user_data['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user_data.get('is_active', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    access_token = create_access_token(data={"sub": user_data['id']})
    
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    user_response = UserResponse(**user_data)
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db))):
    return current_user

# ==================== TEMPLATE ENDPOINTS ====================

@api_router.post("/templates", response_model=Template)
async def create_template(
    name: str,
    description: str = None,
    width: float = 1000,
    height: float = 707,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    # Save uploaded file
    file_extension = file.filename.split('.')[-1].lower()
    file_type = "image" if file_extension in ['jpg', 'jpeg', 'png'] else "pdf"
    
    file_id = str(uuid.uuid4())
    file_path = TEMPLATES_DIR / f"{file_id}.{file_extension}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    template = Template(
        name=name,
        description=description,
        file_url=str(file_path),
        file_type=file_type,
        width=width,
        height=height,
        created_by=current_user.id
    )
    
    template_dict = template.model_dump()
    template_dict['created_at'] = template_dict['created_at'].isoformat()
    template_dict['updated_at'] = template_dict['updated_at'].isoformat()
    
    await database.templates.insert_one(template_dict)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="template",
        resource_id=template.id
    )
    await database.audit_logs.insert_one({**audit.model_dump(), 'timestamp': audit.timestamp.isoformat()})
    
    return template

@api_router.get("/templates", response_model=List[Template])
async def get_templates(
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    templates = await database.templates.find({}, {"_id": 0}).to_list(1000)
    
    for template in templates:
        if isinstance(template.get('created_at'), str):
            template['created_at'] = datetime.fromisoformat(template['created_at'])
        if isinstance(template.get('updated_at'), str):
            template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return templates

@api_router.get("/templates/{template_id}", response_model=Template)
async def get_template(
    template_id: str,
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    template = await database.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if isinstance(template.get('created_at'), str):
        template['created_at'] = datetime.fromisoformat(template['created_at'])
    if isinstance(template.get('updated_at'), str):
        template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return Template(**template)

@api_router.put("/templates/{template_id}", response_model=Template)
async def update_template(
    template_id: str,
    update_data: TemplateUpdate,
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    template = await database.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Convert FieldConfig objects to dicts if present
    if 'fields' in update_dict:
        update_dict['fields'] = [field.model_dump() if isinstance(field, FieldConfig) else field for field in update_dict['fields']]
    
    await database.templates.update_one({"id": template_id}, {"$set": update_dict})
    
    updated_template = await database.templates.find_one({"id": template_id}, {"_id": 0})
    
    if isinstance(updated_template.get('created_at'), str):
        updated_template['created_at'] = datetime.fromisoformat(updated_template['created_at'])
    if isinstance(updated_template.get('updated_at'), str):
        updated_template['updated_at'] = datetime.fromisoformat(updated_template['updated_at'])
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="template",
        resource_id=template_id
    )
    await database.audit_logs.insert_one({**audit.model_dump(), 'timestamp': audit.timestamp.isoformat()})
    
    return Template(**updated_template)

@api_router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    template = await database.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Delete file
    if os.path.exists(template['file_url']):
        os.remove(template['file_url'])
    
    await database.templates.delete_one({"id": template_id})
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="template",
        resource_id=template_id
    )
    await database.audit_logs.insert_one({**audit.model_dump(), 'timestamp': audit.timestamp.isoformat()})
    
    return {"message": "Template deleted successfully"}

@api_router.get("/templates/{template_id}/image")
async def get_template_image(template_id: str, database: AsyncIOMotorDatabase = Depends(get_db)):
    template = await database.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    file_path = template['file_url']
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Template file not found")
    
    return FileResponse(file_path)

# ==================== CERTIFICATE GENERATION ====================

async def generate_certificate_image(template: dict, certificate_data: dict, database: AsyncIOMotorDatabase):
    """Generate certificate image with all fields"""
    # Load template image
    template_img = Image.open(template['file_url']).convert('RGB')
    draw = ImageDraw.Draw(template_img)
    
    # Generate QR code
    verification_url = f"https://certgen-8.preview.emergentagent.com/verify/{certificate_data['unique_code']}"
    qr_data = generate_qr_code(verification_url, size=200)
    
    # Draw fields
    for field in template.get('fields', []):
        field_type = field['field_type']
        x, y = int(field['x']), int(field['y'])
        font_size = field.get('font_size', 14)
        font_color = field.get('font_color', '#000000')
        
        # Get field value
        value = ""
        if field_type == "participant_name":
            value = certificate_data['participant_name']
        elif field_type == "document_id":
            value = certificate_data['document_id']
        elif field_type == "certifier_name":
            value = certificate_data['certifier_name']
        elif field_type == "representative_name":
            value = certificate_data['representative_name']
        elif field_type == "representative_name_2" and certificate_data.get('representative_name_2'):
            value = certificate_data['representative_name_2']
        elif field_type == "date":
            value = certificate_data['issue_date'].strftime("%d/%m/%Y")
        elif field_type == "unique_code":
            value = certificate_data['unique_code']
        elif field_type == "qr_code":
            # Decode and paste QR code
            qr_img_data = base64.b64decode(qr_data.split(',')[1])
            qr_img = Image.open(BytesIO(qr_img_data))
            qr_size = int(field['width'])
            qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
            template_img.paste(qr_img, (x, y))
            continue
        
        if value:
            font = get_font(field.get('font_family', 'Arial'), font_size)
            color = hex_to_rgb(font_color)
            draw.text((x, y), value, font=font, fill=color)
    
    # Save certificate
    cert_filename = f"{certificate_data['id']}.png"
    cert_path = CERTIFICATES_DIR / cert_filename
    template_img.save(cert_path, 'PNG')
    
    return str(cert_path)

@api_router.post("/certificates", response_model=CertificateResponse)
async def create_certificate(
    cert_data: CertificateCreate,
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    # Get template
    template = await database.templates.find_one({"id": cert_data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create certificate
    certificate = Certificate(
        template_id=cert_data.template_id,
        participant_name=cert_data.participant_name,
        document_id=cert_data.document_id,
        certifier_name=cert_data.certifier_name,
        representative_name=cert_data.representative_name,
        representative_name_2=cert_data.representative_name_2,
        event_name=cert_data.event_name,
        course_name=cert_data.course_name,
        created_by=current_user.id
    )
    
    # Generate hash
    certificate.hash_code = generate_certificate_hash({
        'unique_code': certificate.unique_code,
        'participant_name': certificate.participant_name,
        'document_id': certificate.document_id,
        'issue_date': certificate.issue_date.isoformat()
    })
    
    # Generate certificate image
    cert_dict = certificate.model_dump()
    pdf_path = await generate_certificate_image(template, cert_dict, database)
    certificate.pdf_url = pdf_path
    
    # Save to database
    cert_dict = certificate.model_dump()
    cert_dict['issue_date'] = cert_dict['issue_date'].isoformat()
    cert_dict['created_at'] = cert_dict['created_at'].isoformat()
    
    await database.certificates.insert_one(cert_dict)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="certificate",
        resource_id=certificate.id
    )
    await database.audit_logs.insert_one({**audit.model_dump(), 'timestamp': audit.timestamp.isoformat()})
    
    return CertificateResponse(**certificate.model_dump())

@api_router.post("/certificates/batch", response_model=List[CertificateResponse])
async def create_certificates_batch(
    batch_data: CertificateBatchCreate,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    # Get template
    template = await database.templates.find_one({"id": batch_data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Read Excel file
    try:
        contents = await file.read()
        workbook = openpyxl.load_workbook(BytesIO(contents))
        sheet = workbook.active
        
        certificates = []
        
        # Expected columns: participant_name, document_id, certifier_name, representative_name, representative_name_2 (optional)
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not row[0]:  # Skip empty rows
                continue
            
            certificate = Certificate(
                template_id=batch_data.template_id,
                participant_name=str(row[0]),
                document_id=str(row[1]),
                certifier_name=str(row[2]),
                representative_name=str(row[3]),
                representative_name_2=str(row[4]) if len(row) > 4 and row[4] else None,
                event_name=batch_data.event_name,
                course_name=batch_data.course_name,
                created_by=current_user.id
            )
            
            # Generate hash
            certificate.hash_code = generate_certificate_hash({
                'unique_code': certificate.unique_code,
                'participant_name': certificate.participant_name,
                'document_id': certificate.document_id,
                'issue_date': certificate.issue_date.isoformat()
            })
            
            # Generate certificate image
            cert_dict = certificate.model_dump()
            pdf_path = await generate_certificate_image(template, cert_dict, database)
            certificate.pdf_url = pdf_path
            
            # Save to database
            cert_dict = certificate.model_dump()
            cert_dict['issue_date'] = cert_dict['issue_date'].isoformat()
            cert_dict['created_at'] = cert_dict['created_at'].isoformat()
            
            await database.certificates.insert_one(cert_dict)
            certificates.append(CertificateResponse(**certificate.model_dump()))
        
        # Audit log
        audit = AuditLog(
            user_id=current_user.id,
            action="batch_create",
            resource_type="certificate",
            resource_id=batch_data.template_id,
            details={"count": len(certificates)}
        )
        await database.audit_logs.insert_one({**audit.model_dump(), 'timestamp': audit.timestamp.isoformat()})
        
        return certificates
    
    except Exception as e:
        logger.error(f"Error processing Excel file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing Excel file: {str(e)}")

@api_router.get("/certificates", response_model=List[CertificateResponse])
async def get_certificates(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    certificates = await database.certificates.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for cert in certificates:
        if isinstance(cert.get('issue_date'), str):
            cert['issue_date'] = datetime.fromisoformat(cert['issue_date'])
        if isinstance(cert.get('created_at'), str):
            cert['created_at'] = datetime.fromisoformat(cert['created_at'])
    
    return [CertificateResponse(**cert) for cert in certificates]

@api_router.get("/certificates/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: str,
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    cert = await database.certificates.find_one({"id": certificate_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if isinstance(cert.get('issue_date'), str):
        cert['issue_date'] = datetime.fromisoformat(cert['issue_date'])
    if isinstance(cert.get('created_at'), str):
        cert['created_at'] = datetime.fromisoformat(cert['created_at'])
    
    return CertificateResponse(**cert)

@api_router.get("/certificates/{certificate_id}/download")
async def download_certificate(
    certificate_id: str,
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    cert = await database.certificates.find_one({"id": certificate_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if not cert.get('pdf_url') or not os.path.exists(cert['pdf_url']):
        raise HTTPException(status_code=404, detail="Certificate file not found")
    
    return FileResponse(
        cert['pdf_url'],
        media_type='image/png',
        filename=f"certificate_{cert['unique_code']}.png"
    )

# ==================== PUBLIC VERIFICATION ====================

@api_router.get("/verify/{unique_code}", response_model=CertificateResponse)
async def verify_certificate(
    unique_code: str,
    request: Request,
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    cert = await database.certificates.find_one({"unique_code": unique_code.upper()}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Update validation count
    await database.certificates.update_one(
        {"unique_code": unique_code.upper()},
        {"$inc": {"validation_count": 1}}
    )
    
    # Log validation
    validation = CertificateValidation(
        certificate_id=cert['id'],
        ip_address=request.client.host,
        user_agent=request.headers.get('user-agent')
    )
    await database.validations.insert_one({**validation.model_dump(), 'validated_at': validation.validated_at.isoformat()})
    
    if isinstance(cert.get('issue_date'), str):
        cert['issue_date'] = datetime.fromisoformat(cert['issue_date'])
    if isinstance(cert.get('created_at'), str):
        cert['created_at'] = datetime.fromisoformat(cert['created_at'])
    
    cert['validation_count'] = cert.get('validation_count', 0) + 1
    
    return CertificateResponse(**cert)

# ==================== STATS & REPORTS ====================

@api_router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    total_templates = await database.templates.count_documents({})
    total_certificates = await database.certificates.count_documents({})
    
    # Certificates this month
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    certificates_this_month = await database.certificates.count_documents({
        "created_at": {"$gte": start_of_month.isoformat()}
    })
    
    total_validations = await database.validations.count_documents({})
    
    # Recent certificates
    recent_certs = await database.certificates.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    for cert in recent_certs:
        if isinstance(cert.get('issue_date'), str):
            cert['issue_date'] = datetime.fromisoformat(cert['issue_date'])
        if isinstance(cert.get('created_at'), str):
            cert['created_at'] = datetime.fromisoformat(cert['created_at'])
    
    return StatsResponse(
        total_templates=total_templates,
        total_certificates=total_certificates,
        certificates_this_month=certificates_this_month,
        total_validations=total_validations,
        recent_certificates=[CertificateResponse(**cert) for cert in recent_certs]
    )

# ==================== USER MANAGEMENT ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(
    current_user: UserResponse = Depends(lambda creds, db=Depends(get_db): get_current_user(creds, db)),
    database: AsyncIOMotorDatabase = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await database.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return [UserResponse(**user) for user in users]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
