import threading
import logging
from confluent_kafka import Consumer, KafkaError

log = logging.getLogger(__name__)


def extract_value(message, key):
    """Finds key in message, returns trimmed value up to next ' | ' or end."""
    start = message.find(key)
    if start == -1:
        return None
    start += len(key)
    end = message.find(' | ', start)
    if end == -1:
        end = len(message)
    return message[start:end].strip()


def is_valid_email(email):
    return bool(email and email.strip() and email != 'Unknown')


def handle_complaint_event(message, db, Notification):
    try:
        if 'RESOLVED' in message:
            student_email = extract_value(message, 'Student: ')
            title = extract_value(message, 'Title: ')
            worker_email = extract_value(message, 'Worker: ')
            if not is_valid_email(student_email):
                log.warn('Skipping RESOLVED notification — no valid student email in: %s', message)
                return
            n = Notification(
                recipient_email=student_email,
                title='✅ Complaint Resolved!',
                message=f"Your complaint '{title}' has been resolved by {worker_email}.",
                type='COMPLAINT_RESOLVED'
            )
            db.session.add(n)
            db.session.commit()
            log.info('RESOLVED notification saved for: %s', student_email)

        elif 'NEW_COMPLAINT' in message:
            student_email = extract_value(message, 'Student: ')
            title = extract_value(message, 'Title: ')
            category = extract_value(message, 'Category: ')
            if not is_valid_email(student_email):
                log.warn('Skipping NEW_COMPLAINT notification — no valid student email in: %s', message)
                return
            n = Notification(
                recipient_email=student_email,
                title='📋 Complaint Submitted!',
                message=f"Your {category} complaint '{title}' has been received and will be assigned to a worker.",
                type='COMPLAINT_CREATED'
            )
            db.session.add(n)
            db.session.commit()
            log.info('NEW_COMPLAINT notification saved for: %s', student_email)

    except Exception as e:
        db.session.rollback()
        log.error('complaint event error: %s', e)


def handle_match_found(message, db, Notification):
    try:
        parts = message.split('|')
        if len(parts) < 5:
            log.warn('Invalid match-found message format: %s', message)
            return
        email1 = parts[0].strip()
        email2 = parts[1].strip()
        item_id1 = int(parts[2].strip())
        item_id2 = int(parts[3].strip())
        item_name = parts[4].strip()

        if is_valid_email(email1):
            db.session.add(Notification(
                recipient_email=email1,
                title='🤖 AI Match Found!',
                message=f"Your lost item '{item_name}' may have been found! Check Lost & Found.",
                type='MATCH_FOUND',
                related_item_id=item_id1
            ))
            log.info('Match notification saved for: %s', email1)
        else:
            log.warn('Skipping match notification — invalid email1: %s', email1)

        if is_valid_email(email2):
            db.session.add(Notification(
                recipient_email=email2,
                title='🤖 Match Found!',
                message="The item you found matches a lost report! Check Lost & Found.",
                type='MATCH_FOUND',
                related_item_id=item_id2
            ))
            log.info('Match notification saved for: %s', email2)
        else:
            log.warn('Skipping match notification — invalid email2: %s', email2)

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        log.error('match event error: %s', e)


def start_kafka_consumer(app, db, Notification, bootstrap_servers, group_id):
    def consumer_loop():
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
                with app.app_context():
                    if topic == 'complaint-events':
                        handle_complaint_event(raw, db, Notification)
                    elif topic == 'match-found-topic':
                        handle_match_found(raw, db, Notification)
            except Exception as e:
                log.error('consumer loop error: %s', e)

    t = threading.Thread(target=consumer_loop, daemon=True, name='KafkaConsumer')
    t.start()
    log.info('Kafka consumer thread launched')
