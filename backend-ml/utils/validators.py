from fastapi import UploadFile, HTTPException

ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp'}

def validate_image_file(file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail='Unsupported file type')
    return True
