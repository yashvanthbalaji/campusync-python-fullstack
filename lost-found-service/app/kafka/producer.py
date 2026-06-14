import os
import logging
from confluent_kafka import Producer

log = logging.getLogger(__name__)

_producer = None


def get_producer():
    """Return a module-level confluent_kafka.Producer singleton."""
    global _producer
    if _producer is None:
        bootstrap_servers = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        _producer = Producer({'bootstrap.servers': bootstrap_servers})
        log.info("[Kafka] Producer created with servers: %s", bootstrap_servers)
    return _producer


def send_match_event(email1, email2, item_id1, item_id2, item_name):
    """
    Produce a match-found event to Kafka topic 'match-found-topic'.
    Message format: email1|email2|item_id1|item_id2|item_name
    Non-fatal on failure — logs a warning and continues.
    """
    try:
        message = f"{email1}|{email2}|{item_id1}|{item_id2}|{item_name}"
        producer = get_producer()
        producer.produce('match-found-topic', value=message.encode('utf-8'))
        producer.flush(timeout=3)
        log.info("[Kafka] Match event sent: %s", message)
    except Exception as e:
        log.warning("[Kafka] Failed to send match event: %s", e)
