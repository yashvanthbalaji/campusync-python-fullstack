import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from app.extensions import db, ma
from app.firebase_auth import init_firebase

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── Configuration ────────────────────────────────────────────────────────
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:admin123@localhost:5432/hostelhub_complaint'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['FIREBASE_CREDENTIALS_PATH'] = os.environ.get(
        'FIREBASE_CREDENTIALS_PATH',
        'firebase-credentials.json'
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

    # ── Extensions ───────────────────────────────────────────────────────────
    db.init_app(app)
    ma.init_app(app)
    init_firebase(app)

    # ── Create tables ────────────────────────────────────────────────────────
    with app.app_context():
        from app.models.models import Complaint  # noqa: F401
        db.create_all()

    # ── Blueprints ───────────────────────────────────────────────────────────
    from app.routes.complaint_routes import complaint_bp
    app.register_blueprint(complaint_bp)

    return app
