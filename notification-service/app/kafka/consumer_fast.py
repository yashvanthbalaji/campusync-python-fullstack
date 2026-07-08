"""
FastAPI-compatible Kafka consumer for notification-service.
Replaces Flask app_context() with direct SQLAlchemy session management.
"""
import threading
import logging
from confluent_kafka import Consumer, KafkaError
from app.kafka.consumer import handle_complaint_event, handle_match_found

log = logging.getLogger(__name__)


class DBSession:
    """Wraps SQLAlchemy SessionLocal to mimic Flask-SQLAlchemy db.session interface."""
    def __init__(self, session_factory):
        self._factory = session_factory
        self.session = session_factory()

    def add(self, obj):
        self.session.add(obj)

    def commit(self):
        self.session.commit()

    def rollback(self):
        self.session.rollback()
        # Refresh session after rollback
        self.session.close()
        self.session = self._factory()


def start_kafka_consumer_fast(Notification, bootstrap_servers, group_id, session_factory):
    """
    FastAPI-compatible Kafka consumer that uses SQLAlchemy sessions directly
    instead of Flask app_context().
    """
    def consumer_loop():
        db = DBSession(session_factory)

        consumer = Consumer({
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
        })
        consumer.subscribe(['complaint-events', 'match-found-topic'])
        log.info('Kafka consumer started, subscribed to: complaint-events, match-found-topic')

        while True:
            try:
                msg = consumer.poll(timeout=1.0)
                if msg is None:
                    continue
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    log.error('Kafka consumer error: %s', msg.error())
                    continue

                raw = msg.value().decode('utf-8')
                topic = msg.topic()
                log.info('Received event on topic [%s]: %s', topic, raw)

                if topic == 'complaint-events':
                    handle_complaint_event(raw, db, Notification)
                elif topic == 'match-found-topic':
                    handle_match_found(raw, db, Notification)

            except Exception as e:
                log.error('consumer loop error: %s', e)

    t = threading.Thread(target=consumer_loop, daemon=True, name='KafkaConsumer')
    t.start()
    log.info('Kafka consumer thread launched')
