import os
from flask import Flask
from flask_cors import CORS
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from app.extensions import db, ma

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── Configuration ────────────────────────────────────────────────────────
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:admin123@localhost:5432/hostelhub_notifications'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

    # ── Extensions ───────────────────────────────────────────────────────────
    db.init_app(app)
    ma.init_app(app)

    # ── Create tables ────────────────────────────────────────────────────────
    with app.app_context():
        from app.models.models import Notification  # noqa: F401
        db.create_all()

    # ── Blueprints ───────────────────────────────────────────────────────────
    from app.routes.notification_routes import notification_bp
    app.register_blueprint(notification_bp)

    # ── Kafka Consumer ────────────────────────────────────────────────────────
    from app.kafka.consumer import start_kafka_consumer
    from app.models.models import Notification
    start_kafka_consumer(
        app, db, Notification,
        os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
        os.environ.get('KAFKA_GROUP_ID', 'notification-group')
    )

    return app
