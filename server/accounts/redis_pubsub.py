import json
import redis
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# Redis client for pub/sub
redis_client = redis.Redis(
    host=settings.REDIS_HOST if hasattr(settings, 'REDIS_HOST') else 'localhost',
    port=settings.REDIS_PORT if hasattr(settings, 'REDIS_PORT') else 6379,
    db=0,
    decode_responses=True
)

def publish_challenge_event(event_type, challenge_id, data):
    """
    Publish challenge events to Redis
    event_type: 'accepted', 'rejected', 'expired'
    """
    channel = f"challenge_{challenge_id}"
    payload = {
        'event': event_type,
        'challenge_id': challenge_id,
        'data': data,
        'timestamp': str(data.get('timestamp', ''))
    }
    redis_client.publish(channel, json.dumps(payload))

def notify_user_via_channel(user_id, message):
    """Send WebSocket notification to specific user"""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            'type': 'user_notification',
            'message': message
        }
    )