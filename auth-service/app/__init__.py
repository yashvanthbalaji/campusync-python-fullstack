import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from app.extensions import db, ma
from app.firebase_auth import init_firebase
from app.routes.user_routes import user_bp

def create_app():
    # Load .env via python-dotenv
    load_dotenv()

    app = Flask(__name__)
    CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

    # Set configuration values from environment variables
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['FIREBASE_CREDENTIALS_PATH'] = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
    app.config['COMPLAINT_SERVICE_URL'] = os.environ.get('COMPLAINT_SERVICE_URL', 'http://localhost:8082')

    # Initialize extensions with app
    db.init_app(app)
    ma.init_app(app)

    # Initialize Firebase
    init_firebase(app)

    # Register blueprint
    app.register_blueprint(user_bp)

    return app
