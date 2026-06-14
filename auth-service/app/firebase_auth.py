import os
from functools import wraps
from flask import request, jsonify
import firebase_admin
from firebase_admin import credentials, auth

_firebase_initialized = False

def init_firebase(app):
    global _firebase_initialized
    if not _firebase_initialized:
        cred_path = app.config.get('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
        else:
            app.logger.warning(f"Firebase credentials file not found at {cred_path}. Firebase auth will not work.")

def firebase_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401

        token = auth_header.split(' ')[1]
        try:
            decoded_token = auth.verify_id_token(token)
            kwargs['firebase_uid'] = decoded_token.get('uid')
            kwargs['email'] = decoded_token.get('email')
        except Exception:
            return jsonify({'error': 'Unauthorized'}), 401

        return f(*args, **kwargs)
    return decorated_function
