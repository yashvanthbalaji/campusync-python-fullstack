from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.firebase_auth_fast import init_firebase
from app.routes.lost_found_routes_fast import router
from app.database import engine
from app.models.models import Base

load_dotenv()

app = FastAPI(title='HostelHub Lost & Found Service', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'https://campusync.tech',
        'https://www.campusync.tech',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

init_firebase()
Base.metadata.create_all(bind=engine)
app.include_router(router)

@app.get('/')
def root():
    return {'message': 'HostelHub Lost & Found Service - FastAPI'}
