import os
import uuid


def save_file(file_object, subfolder='complaints'):
    """Save an uploaded file with a uuid4 filename, preserving the original extension."""
    original_filename = file_object.filename
    ext = os.path.splitext(original_filename)[1]  # e.g. '.jpg'
    unique_filename = f"{uuid.uuid4()}{ext}"

    upload_dir = os.path.join('uploads', subfolder)
    os.makedirs(upload_dir, exist_ok=True)

    file_object.save(os.path.join(upload_dir, unique_filename))
    return unique_filename


def get_file_path(filename, subfolder='complaints'):
    """Return the full relative path for a stored file."""
    return os.path.join('uploads', subfolder, filename)
