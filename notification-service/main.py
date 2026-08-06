from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import SessionLocal, engine
    from app.models.models import Notification, Base
    from app.kafka.consumer_fast import start_kafka_consumer_fast

    Base.metadata.create_all(bind=engine)

    start_kafka_consumer_fast(
        Notification=Notification,
        bootstrap_servers=os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
        group_id=os.environ.get('KAFKA_GROUP_ID', 'notification-group'),
        session_factory=SessionLocal
    )
    yield

app = FastAPI(
    title='HostelHub Notification Service',
    version='2.0.0',
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

from app.routes.notification_routes_fast import router
app.include_router(router)

@app.get('/')
def root():
    return {'message': 'HostelHub Notification Service - FastAPI'}
