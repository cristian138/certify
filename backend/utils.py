import hashlib
import qrcode
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import os
from datetime import datetime
from typing import Dict, Any
import base64

# Font mapping - map frontend font names to system fonts
FONT_MAP = {
    'Arial': '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    'Helvetica': '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    'Times New Roman': '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    'Georgia': '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    'Courier New': '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    'Verdana': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    'Palatino': '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    'Garamond': '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    'Bookman': '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
    'Comic Sans MS': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    'Trebuchet MS': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    'Impact': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    'Dancing Script': '/usr/share/fonts/truetype/cursive/DancingScript.ttf',
    'Great Vibes': '/usr/share/fonts/truetype/cursive/GreatVibes.ttf',
    'Parisienne': '/usr/share/fonts/truetype/cursive/Parisienne.ttf',
    'Allura': '/usr/share/fonts/truetype/cursive/Allura.ttf',
}

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
    """Get font object with proper mapping"""
    # Get the system font path from the mapping
    font_path = FONT_MAP.get(font_name)
    
    if font_path and os.path.exists(font_path):
        try:
            return ImageFont.truetype(font_path, size)
        except Exception as e:
            print(f"Error loading font {font_name} from {font_path}: {e}")
    
    # Fallback chain
    fallback_fonts = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    
    for fallback in fallback_fonts:
        if os.path.exists(fallback):
            try:
                return ImageFont.truetype(fallback, size)
            except:
                continue
    
    # Last resort: PIL default font
    return ImageFont.load_default()

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
