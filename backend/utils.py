import hashlib
import qrcode
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import os
from datetime import datetime
from typing import Dict, Any
import base64

def generate_certificate_hash(data: Dict[str, Any]) -> str:
    """Generate SHA256 hash for certificate integrity"""
    hash_string = f"{data['unique_code']}{data['participant_name']}{data['document_id']}{data['issue_date']}"
    return hashlib.sha256(hash_string.encode()).hexdigest()

def generate_qr_code(data: str, size: int = 300) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def get_font(font_name: str, size: int):
    """Get font object, fallback to default if not found"""
    try:
        # Try to use the specified font
        font_path = f"/usr/share/fonts/truetype/{font_name.lower()}.ttf"
        return ImageFont.truetype(font_path, size)
    except:
        try:
            # Fallback to DejaVu
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except:
            # Last resort: default font
            return ImageFont.load_default()

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
