"""
In-process background jobs (replaces Celery worker + beat and Redis).

Each job is an ordinary function run periodically on Daphne's event loop via
sync_to_async(thread_sensitive=False): the function runs in a worker thread,
so it never blocks requests, and any async_to_sync(channel_layer.group_send)
call inside it is routed back to Daphne's loop, which keeps the in-memory
channel layer thread-safe.

Constraints: run exactly ONE web process/instance (each process would start
its own scheduler and keep its own WebSocket groups), and jobs pause while the
service is asleep.
"""
import asyncio
import logging
import threading
import time

from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import close_old_connections

logger = logging.getLogger(__name__)


def _data_retention():
    from alerts.tasks import acknowledge_stale_alerts, cleanup_old_alerts
    from analytics.tasks import prune_history
    from telemetry.tasks import cleanup_old_telemetry

    return "; ".join([
        cleanup_old_telemetry(),
        prune_history(),
        cleanup_old_alerts(),
        acknowledge_stale_alerts(),
    ])


def get_jobs():
    """(name, interval_seconds, callable) for every enabled job."""
    from alerts.tasks import check_alert_conditions
    from analytics.tasks import (
        generate_performance_analytics, run_batch_simulations, update_competitor_analysis,
    )
    from strategy.tasks import update_strategy_predictions
    from telemetry.tasks import advance_race_simulation, update_weather_data

    intervals = settings.BACKGROUND_JOB_INTERVALS
    jobs = []
    if settings.RACE_SIMULATION_ENABLED:
        jobs += [
            ("race_simulation", advance_race_simulation),
            ("weather", update_weather_data),
        ]
    jobs += [
        ("strategy_predictions", update_strategy_predictions),
        ("alert_conditions", check_alert_conditions),
        ("performance_analytics", generate_performance_analytics),
        ("competitor_analysis", update_competitor_analysis),
        ("batch_simulations", run_batch_simulations),
        ("data_retention", _data_retention),
    ]
    return [(name, intervals[name], func) for name, func in jobs]


def _run_in_thread(func):
    # Worker threads keep their own DB connection; drop stale/broken ones
    # around each run so a dropped Supabase connection can't wedge a job.
    close_old_connections()
    try:
        return func()
    finally:
        close_old_connections()


class JobScheduler:
    def __init__(self):
        self._lock = threading.Lock()
        self._tasks = []
        self.last_runs = {}

    @property
    def started(self):
        return bool(self._tasks)

    def start(self):
        """Start all job loops on the running event loop (idempotent)."""
        with self._lock:
            if self._tasks:
                return
            loop = asyncio.get_running_loop()
            jobs = get_jobs()
            for index, (name, interval, func) in enumerate(jobs):
                # Stagger first runs so jobs don't all hit the DB at once.
                task = loop.create_task(
                    self._job_loop(name, interval, func, initial_delay=2 + index),
                    name=f"job:{name}",
                )
                self._tasks.append(task)
            logger.info("Started %d background jobs: %s", len(jobs),
                        ", ".join(f"{n}/{i}s" for n, i, _ in jobs))

    async def _job_loop(self, name, interval, func, initial_delay):
        await asyncio.sleep(initial_delay)
        while True:
            started = time.monotonic()
            try:
                result = await sync_to_async(_run_in_thread, thread_sensitive=False)(func)
                self.last_runs[name] = {"ok": True, "result": result, "at": time.time()}
                logger.info("Job %s: %s", name, result)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.last_runs[name] = {"ok": False, "error": str(exc), "at": time.time()}
                logger.exception("Job %s failed", name)
            # Fixed-rate schedule; a slow run never overlaps with itself.
            await asyncio.sleep(max(0.0, interval - (time.monotonic() - started)))

    async def stop(self):
        with self._lock:
            tasks, self._tasks = self._tasks, []
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


scheduler = JobScheduler()


class BackgroundJobsMiddleware:
    """
    ASGI middleware that starts the scheduler on the first connection (HTTP
    or WebSocket), i.e. inside Daphne's running event loop. Daphne doesn't
    implement the ASGI lifespan protocol, so this is the earliest safe point;
    Render's health check triggers it right after each deploy.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if settings.BACKGROUND_JOBS_ENABLED and not scheduler.started:
            scheduler.start()
        return await self.app(scope, receive, send)
