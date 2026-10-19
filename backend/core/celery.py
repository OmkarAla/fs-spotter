from celery import Celery
from django.conf import settings
import os

# Set the name to the module name.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')

# Using a string here means the worker doesn't have to serialize
# the configuration object to send it to workers.
# namespace='CELERY' means all celery-related configuration options
# have the prefix 'CELERY_' in settings.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()
