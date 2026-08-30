import asyncio
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "transcription_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="tasks.process_media_task")
def process_media_task(media_id: int):
    """Celery task entry point."""
    from app.workers.runner import pipeline_runner
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(pipeline_runner.run_pipeline(media_id))
    finally:
        loop.close()
