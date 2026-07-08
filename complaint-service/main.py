from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.firebase_auth_fast import init_firebase
from app.routes.complaint_routes_fast import router

load_dotenv()

app = FastAPI(title='HostelHub Complaint Service', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

init_firebase()
app.include_router(router)

@app.get('/')
def root():
    return {'message': 'HostelHub Complaint Service - FastAPI'}
