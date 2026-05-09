SPORT_KEYWORDS = {
    "football": ["football", "soccer", "keeper", "defender", "striker"],
    "tennis": ["tennis", "racket", "doubles", "singles"],
    "basketball": ["basketball", "hoops", "guard", "court"],
    "running": ["running", "runner", "run", "jog", "marathon"],
    "volleyball": ["volleyball", "setter", "spike", "beach"],
}


def extract_interests(description: str) -> dict:
    lowered = description.lower()
    sports = [
        sport.title()
        for sport, keywords in SPORT_KEYWORDS.items()
        if any(keyword in lowered for keyword in keywords)
    ]
    traits = [
        word
        for word in ["casual", "competitive", "beginner", "intermediate", "advanced", "social"]
        if word in lowered
    ]
    return {
        "sports": sports,
        "traits": traits,
        "summary": " ".join(description.split()[:24]),
        "provider": "local-placeholder",
    }


def compatibility_score(user_a: dict, user_b: dict) -> dict:
    sports_a = {sport.lower() for sport in user_a.get("sports", [])}
    sports_b = {sport.lower() for sport in user_b.get("sports", [])}
    overlap = sports_a & sports_b
    same_city = bool(user_a.get("city") and user_a.get("city") == user_b.get("city"))
    score = 45 + (len(overlap) * 20) + (15 if same_city else 0)
    return {
        "score": min(score, 100),
        "shared_sports": sorted(sport.title() for sport in overlap),
        "signals": {
            "same_city": same_city,
            "shared_sport_count": len(overlap),
        },
        "provider": "local-placeholder",
    }

