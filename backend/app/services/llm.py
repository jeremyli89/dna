from ..config import settings


async def generate_insight(metrics: dict, insight_type: str) -> str:
    if settings.anthropic_api_key:
        try:
            return await _llm_insight(metrics, insight_type)
        except Exception:
            pass
    return _template_insight(metrics, insight_type)


async def _llm_insight(metrics: dict, insight_type: str) -> str:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = _build_prompt(metrics, insight_type)

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=120,
        messages=[{"role": "user", "content": prompt}],
    )

    content = message.content[0].text.strip()

    if _validate_insight(content, metrics):
        return content
    return _template_insight(metrics, insight_type)


def _build_prompt(metrics: dict, insight_type: str) -> str:
    dims = metrics.get("current_dimensions", {})
    deltas = metrics.get("dimension_deltas") or {}
    new_artists = metrics.get("new_artists_this_month", 0)
    stream_count = metrics.get("stream_count", 0)

    significant_changes = {k: v for k, v in deltas.items() if abs(v) > 5}
    changes_str = (
        f"Score changes vs prior month: {significant_changes}"
        if significant_changes
        else "Scores relatively stable vs prior month"
    )

    return (
        f"Music listening data for the past 30 days:\n"
        f"- Total streams: {stream_count}\n"
        f"- Unique new artists discovered: {new_artists}\n"
        f"- Explorer (new discovery) score: {dims.get('explorer', 50):.0f}/100\n"
        f"- Adventurous (genre diversity) score: {dims.get('adventurous', 50):.0f}/100\n"
        f"- Nostalgic (older music) score: {dims.get('nostalgic', 50):.0f}/100\n"
        f"- Mainstream score: {dims.get('mainstream', 50):.0f}/100\n"
        f"- Night Owl score: {dims.get('night_owl', 0):.0f}/100\n"
        f"- {changes_str}\n\n"
        f"Write exactly ONE concise, friendly sentence (max 20 words) describing "
        f"the most interesting insight. Be specific with numbers. "
        f"Use second person (you/your). No generic statements."
    )


def _validate_insight(content: str, metrics: dict) -> bool:
    if len(content) > 200 or len(content) < 10:
        return False
    lower = content.lower()
    return "you" in lower or "your" in lower


def _template_insight(metrics: dict, insight_type: str) -> str:
    dims = metrics.get("current_dimensions", {})
    deltas = metrics.get("dimension_deltas") or {}
    new_artists = metrics.get("new_artists_this_month", 0)
    stream_count = metrics.get("stream_count", 0)

    if deltas:
        biggest = max(deltas, key=lambda k: abs(deltas[k]))
        val = deltas[biggest]
        if abs(val) > 5:
            direction = "rose" if val > 0 else "dropped"
            label = biggest.replace("_", " ").title()
            return f"Your {label} score {direction} by {abs(val):.0f} points this month."

    explorer = dims.get("explorer", 50)
    if explorer > 70:
        return f"You explored {new_artists} new artists this month — you're in full discovery mode."
    elif explorer < 30:
        return f"You leaned deep into your favorites this month, streaming {stream_count} times."
    return f"You discovered {new_artists} new artists across {stream_count} streams this month."
