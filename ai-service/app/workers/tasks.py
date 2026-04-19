def enqueue_report_task(session_id: str) -> dict:
    return {"queued": False, "session_id": session_id}
