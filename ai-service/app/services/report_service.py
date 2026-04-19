from app.schemas.report_schema import ReportGenerateResponse


def generate_report_summary(
    session_id: str,
    topic_name: str,
    duration_minutes: int,
    avg_focus_percent: int,
    readiness_score: int,
    notes: str,
) -> ReportGenerateResponse:
    quality = "Excellent" if avg_focus_percent >= 75 else "Good" if avg_focus_percent >= 55 else "Needs attention"

    summary = (
        f"Session on '{topic_name}' completed in {duration_minutes} minutes with "
        f"average focus {avg_focus_percent}% and readiness {readiness_score}%. "
        f"Overall performance: {quality}."
    )

    markdown = "\n".join(
        [
            f"# Study Session Report - {topic_name}",
            "",
            f"- Duration: {duration_minutes} minutes",
            f"- Average Focus: {avg_focus_percent}%",
            f"- Readiness: {readiness_score}%",
            f"- Quality: {quality}",
            "",
            "## Notes",
            notes if notes else "No notes provided.",
            "",
            "## Summary",
            summary,
        ]
    )

    return ReportGenerateResponse(
        session_id=session_id,
        status="completed",
        summary=summary,
        markdown=markdown,
    )
