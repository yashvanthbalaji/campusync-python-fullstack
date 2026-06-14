import os
import logging
from datetime import datetime
from confluent_kafka import Producer

log = logging.getLogger(__name__)

_producer = None

def get_producer():
    global _producer
    if _producer is None:
        bootstrap_servers = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        config = {
            'bootstrap.servers': bootstrap_servers
        }
        try:
            _producer = Producer(config)
            log.info("Kafka Producer successfully initialized with servers: %s", bootstrap_servers)
        except Exception as e:
            log.error("Failed to initialize Kafka Producer: %s", e)
    return _producer

def send_complaint_event(message):
    producer = get_producer()
    if not producer:
        log.warning("Kafka Producer not initialized. Skipping event: %s", message)
        return
    try:
        producer.produce('complaint-events', message.encode('utf-8'))
        producer.flush(timeout=3)
        log.info("Kafka event sent to topic 'complaint-events': %s", message)
    except Exception as e:
        log.warning("Could not produce Kafka event (non-fatal): %s", e)


def build_new_complaint_message(complaint):
    return (
        f"NEW_COMPLAINT | Student: {complaint.student_email} | "
        f"Title: {complaint.title} | "
        f"Category: {complaint.category} | "
        f"WorkType: {complaint.work_type} | "
        f"Room: {complaint.room_number or 'N/A'} | "
        f"TimeOfDay: {complaint.time_of_day or 'N/A'} | "
        f"HasPhoto: {str(complaint.image_path is not None).lower()} | "
        f"AssignedTo: {complaint.assigned_worker_email or 'UNASSIGNED'} | "
        f"Status: PENDING | "
        f"Time: {datetime.utcnow()}"
    )


def build_resolved_message(complaint, worker_email, worker_note):
    return (
        f"RESOLVED | Student: {complaint.student_email} | "
        f"Title: {complaint.title} | "
        f"Worker: {worker_email} | "
        f"Category: {complaint.work_type} | "
        f"Note: {worker_note} | "
        f"Time: {datetime.utcnow()}"
    )
