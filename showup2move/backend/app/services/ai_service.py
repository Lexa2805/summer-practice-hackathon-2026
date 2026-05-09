import json
import os
import re
from typing import Any


SUPPORTED_SPORTS = ["Football", "Tennis", "Basketball", "Running", "Volleyball"]
SKILL_LEVELS = ["beginner", "intermediate", "advanced"]
SPORT_KEYWORDS = {
    "Football": ["football", "soccer", "keeper", "defender", "striker"],
    "Tennis": ["tennis", "racket", "racquet", "doubles", "singles"],
    "Basketball": ["basketball", "hoops", "guard", "court"],
    "Running": ["running", "runner", "run", "jog", "jogging", "marathon"],
    "Volleyball": ["volleyball", "setter", "spike", "beach volleyball"],
}
SKILL_KEYWORDS = {
    "beginner": ["beginner", "new", "casual", "starting", "easy"],
    "intermediate": ["intermediate", "sometimes", "played before", "regular"],
    "advanced": ["advanced", "competitive", "experienced", "league", "serious"],
}


def _json_from_text(value: str) -> dict[str, Any] | None:
    cleaned = value.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        cleaned = fenced.group(1).strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def _openrouter_json(messages: list[dict[str, Any]], model: str | None = None) -> dict[str, Any] | None:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None

    try:
        import httpx
    except ImportError:
        return None

    selected_model = model or os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:3000"),
                "X-Title": "ShowUp2Move",
            },
            json={
                "model": selected_model,
                "messages": messages,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        return _json_from_text(content)
    except Exception:
        return None


def _normalize_sports(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    allowed = {sport.lower(): sport for sport in SUPPORTED_SPORTS}
    normalized = []
    for value in values:
        sport = allowed.get(str(value).strip().lower())
        if sport and sport not in normalized:
            normalized.append(sport)
    return normalized


def _normalize_skill(value: Any) -> str:
    skill = str(value or "intermediate").strip().lower()
    return skill if skill in SKILL_LEVELS else "intermediate"


def fallback_extract_interests(description: str) -> dict[str, Any]:
    lowered = description.lower()
    sports = [
        sport
        for sport, keywords in SPORT_KEYWORDS.items()
        if any(keyword in lowered for keyword in keywords)
    ]
    skill_level = "intermediate"
    for skill, keywords in SKILL_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            skill_level = skill
            break
    interests = []
    if any(word in lowered for word in ["team", "friends", "social", "group"]):
        interests.append("team activities")
    if any(word in lowered for word in ["casual", "easy", "fun"]):
        interests.append("casual sports")
    if any(word in lowered for word in ["outdoor", "park", "run", "running"]):
        interests.append("outdoor activity")

    return {
        "sports": sports,
        "interests": interests,
        "skill_level": skill_level,
        "summary": " ".join(description.split()[:24]) or "No clear sport preferences detected yet.",
        "provider": "fallback",
    }


def extract_profile_interests(description: str) -> dict[str, Any]:
    prompt = f"""
Return only valid JSON for this sports profile description.
Supported sports: {", ".join(SUPPORTED_SPORTS)}.
skill_level must be one of: beginner, intermediate, advanced.
Description: {description}
JSON shape:
{{
  "sports": [],
  "interests": [],
  "skill_level": "beginner",
  "summary": ""
}}
"""
    result = _openrouter_json(
        [
            {"role": "system", "content": "You extract sport preferences for a social sports matching app."},
            {"role": "user", "content": prompt},
        ]
    )
    if not result:
        return fallback_extract_interests(description)
    return {
        "sports": _normalize_sports(result.get("sports")),
        "interests": result.get("interests") if isinstance(result.get("interests"), list) else [],
        "skill_level": _normalize_skill(result.get("skill_level")),
        "summary": str(result.get("summary") or "AI detected sport preferences."),
        "provider": "openrouter",
    }


def extract_photo_interests(image_url: str) -> dict[str, Any]:
    vision_model = os.getenv("OPENROUTER_VISION_MODEL", os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001"))
    result = _openrouter_json(
        [
            {
                "role": "system",
                "content": (
                    "Analyze only visible non-sensitive sport-related clues. Do not identify people or infer "
                    "sensitive attributes. Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Detect sport-related clues in this profile photo. Supported sports are Football, "
                            "Tennis, Basketball, Running, Volleyball. JSON shape: "
                            '{"detected_sports":[],"detected_interests":[],"confidence":0,"summary":""}'
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            },
        ],
        model=vision_model,
    )
    if not result:
        return {
            "detected_sports": [],
            "detected_interests": [],
            "confidence": 0,
            "summary": "No clear sport-related clues detected.",
            "provider": "fallback",
        }
    confidence = int(result.get("confidence") or 0)
    return {
        "detected_sports": _normalize_sports(result.get("detected_sports")),
        "detected_interests": result.get("detected_interests")
        if isinstance(result.get("detected_interests"), list)
        else [],
        "confidence": max(0, min(confidence, 100)),
        "summary": str(result.get("summary") or "No clear sport-related clues detected."),
        "provider": "openrouter",
    }


def _tokens(value: str | None) -> set[str]:
    return {
        token.strip(".,!?;:()[]{}").lower()
        for token in (value or "").split()
        if len(token.strip(".,!?;:()[]{}")) >= 4
    }


def fallback_compatibility_score(user_a: dict[str, Any], user_b: dict[str, Any]) -> dict[str, Any]:
    sports_a = {str(sport) for sport in user_a.get("sports", [])}
    sports_b = {str(sport) for sport in user_b.get("sports", [])}
    shared_sports = sorted(sports_a.intersection(sports_b))
    score = 0
    if shared_sports:
        score += 40
    if user_a.get("availability") and user_a.get("availability") == user_b.get("availability"):
        score += 20
    if user_a.get("city") and user_a.get("city") == user_b.get("city"):
        score += 20
    if abs(SKILL_LEVELS.index(_normalize_skill(user_a.get("skill_level"))) - SKILL_LEVELS.index(_normalize_skill(user_b.get("skill_level")))) <= 1:
        score += 10
    if _tokens(user_a.get("description")).intersection(_tokens(user_b.get("description"))):
        score += 10

    reason_parts = []
    if shared_sports:
        reason_parts.append(f"shared interest in {', '.join(shared_sports)}")
    if user_a.get("city") and user_a.get("city") == user_b.get("city"):
        reason_parts.append("same city")
    if user_a.get("availability") and user_a.get("availability") == user_b.get("availability"):
        reason_parts.append("same availability")
    reason = "Good match based on " + ", ".join(reason_parts) + "." if reason_parts else "Some compatibility signals are still missing."

    return {
        "score": min(score, 100),
        "reason": reason,
        "shared_sports": shared_sports,
        "recommendation": "Good casual teammate match." if score >= 70 else "Worth trying if schedules align.",
        "provider": "fallback",
    }


def compatibility_score_ai(user_a: dict[str, Any], user_b: dict[str, Any]) -> dict[str, Any]:
    prompt = {
        "task": "Score teammate compatibility for a casual sports matching app.",
        "rules": [
            "score must be an integer 0-100",
            "shared_sports must contain only exact matching sports",
            "reason should be short and friendly",
        ],
        "user_a": user_a,
        "user_b": user_b,
        "output_shape": {
            "score": 0,
            "reason": "",
            "shared_sports": [],
            "recommendation": "",
        },
    }
    result = _openrouter_json(
        [
            {"role": "system", "content": "You produce JSON compatibility scores for sports teammates."},
            {"role": "user", "content": json.dumps(prompt)},
        ]
    )
    if not result:
        return fallback_compatibility_score(user_a, user_b)
    score = int(result.get("score") or 0)
    return {
        "score": max(0, min(score, 100)),
        "reason": str(result.get("reason") or "Good casual teammate match."),
        "shared_sports": result.get("shared_sports") if isinstance(result.get("shared_sports"), list) else [],
        "recommendation": str(result.get("recommendation") or "Good casual teammate match."),
        "provider": "openrouter",
    }


def teammate_recommendations(current_user: dict[str, Any], candidates: list[dict[str, Any]]) -> dict[str, Any]:
    fallback_rows = []
    for candidate in candidates:
        score = fallback_compatibility_score(current_user, candidate)
        fallback_rows.append(
            {
                "user_id": candidate.get("id"),
                "full_name": candidate.get("full_name") or candidate.get("username") or "Player",
                "score": score["score"],
                "reason": score["reason"],
                "shared_sports": score["shared_sports"],
            }
        )
    fallback_rows.sort(key=lambda row: row["score"], reverse=True)

    result = _openrouter_json(
        [
            {
                "role": "system",
                "content": "Return JSON teammate recommendations sorted by score descending. Keep reasons short.",
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "current_user": current_user,
                        "candidates": candidates[:12],
                        "output_shape": {
                            "recommendations": [
                                {
                                    "user_id": "",
                                    "full_name": "",
                                    "score": 0,
                                    "reason": "",
                                }
                            ]
                        },
                    }
                ),
            },
        ]
    )
    rows = result.get("recommendations") if result else None
    if not isinstance(rows, list):
        return {"recommendations": fallback_rows[:5], "provider": "fallback"}

    normalized = []
    candidate_ids = {str(candidate.get("id")) for candidate in candidates}
    for row in rows:
        if not isinstance(row, dict) or str(row.get("user_id")) not in candidate_ids:
            continue
        normalized.append(
            {
                "user_id": row.get("user_id"),
                "full_name": row.get("full_name") or "Player",
                "score": max(0, min(int(row.get("score") or 0), 100)),
                "reason": str(row.get("reason") or "Good teammate match."),
            }
        )
    normalized.sort(key=lambda row: row["score"], reverse=True)
    return {"recommendations": normalized[:5] or fallback_rows[:5], "provider": "openrouter"}
