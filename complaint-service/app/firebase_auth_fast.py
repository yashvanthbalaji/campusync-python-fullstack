import os
import logging
import traceback
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Header, HTTPException
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

_firebase_initialized = False

def init_firebase():
    global _firebase_initialized
    if not _firebase_initialized:
        cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True

class FirebaseUser:
    def __init__(self, uid: str, email: str):
        self.uid = uid
        self.email = email

async def verify_firebase_token(
    authorization: str = Header(..., alias="Authorization")
) -> FirebaseUser:
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Unauthorized')
    token = authorization[7:]
    try:
        decoded = auth.verify_id_token(token, clock_skew_seconds=60)
        return FirebaseUser(uid=decoded['uid'], email=decoded['email'])
    except Exception as e:
        logger.error(f'❌ Token verification FAILED: {type(e).__name__}: {e}')
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=401, detail=f'Unauthorized - {type(e).__name__}: {str(e)}')

