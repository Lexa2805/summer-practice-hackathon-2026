import os
from typing import Any

from app.services.ollama_service import (
    check_ollama_health,
    explain_match_ollama,
    generate_captain_plan_ollama,
)


def _rule_based_match_explanation(group_data: dict[str, Any]) -> dict[str, Any]:
    """Fallback rule-based match explanation."""
    sport_name = group_data.get("sport_name", "this sport")
    member_count = group_data.get("member_count", 0)
    city = group_data.get("city", "your area")
    members = group_data.get("members", [])
    
    reasons = []
    
    if sport_name and sport_name != "this sport":
        reasons.append(f"Everyone selected {sport_name} as their preferred sport.")
    
    if member_count > 0:
        reasons.append(f"Group has {member_count} active members ready to play.")
    
    if city and city != "your area":
        reasons.append(f"All members are located in {city}.")
    
    skill_levels = [m.get("skill_level") for m in members if m.get("skill_level")]
    if skill_levels:
        unique_skills = set(skill_levels)
        if len(unique_skills) == 1:
            reasons.append(f"All members have {skill_levels[0]} skill level.")
        else:
            reasons.append("Skill levels are balanced for a fair match.")
    
    if not reasons:
        reasons = [
            "Members share common sports interests.",
            "Group is ready for casual play.",
            "Good foundation for a sports team.",
        ]
    
    return {
        "title": f"Why this {sport_name} group works",
        "reasons": reasons[:3],
        "summary": f"This is a well-matched {sport_name} group with good compatibility.",
        "source": "rule_based_fallback",
    }


def _rule_based_captain_plan(event_data: dict[str, Any]) -> dict[str, Any]:
    """Fallback rule-based captain plan."""
    event_title = event_data.get("title", "the event")
    location = event_data.get("location_name", "the venue")
    event_time = event_data.get("event_time", "")
    price = event_data.get("price")
    
    plan = [
        f"Confirm {location} is available and accessible.",
        "Send event details to all participants 24 hours before.",
        "Ask members to confirm attendance.",
    ]
    
    if price:
        plan.append(f"Collect ${price} from each participant for the venue.")
    
    plan.append("Arrive 10 minutes early to set up.")
    
    time_str = event_time.split("T")[1][:5] if "T" in event_time else "the scheduled time"
    
    message = f"Hey team! {event_title} is set for {time_str} at {location}. Please confirm if you can make it!"
    
    return {
        "plan": plan[:5],
        "message": message,
        "source": "rule_based_fallback",
    }


def explain_match(group_data: dict[str, Any]) -> dict[str, Any]:
    """
    Generate match explanation using configured AI provider with fallback.
    
    Priority:
    1. Ollama (if AI_PROVIDER=ollama)
    2. OpenRouter (if configured)
    3. Rule-based fallback
    """
    ai_provider = os.getenv("AI_PROVIDER", "").lower()
    
    # Try Ollama first if configured
    if ai_provider == "ollama":
        result = explain_match_ollama(group_data)
        if result:
            return result
    
    # Try OpenRouter if available
    # (OpenRouter integration would go here - not implemented to avoid breaking existing code)
    
    # Fallback to rule-based
    return _rule_based_match_explanation(group_data)


def generate_captain_plan(event_data: dict[str, Any]) -> dict[str, Any]:
    """
    Generate captain plan using configured AI provider with fallback.
    
    Priority:
    1. Ollama (if AI_PROVIDER=ollama)
    2. OpenRouter (if configured)
    3. Rule-based fallback
    """
    ai_provider = os.getenv("AI_PROVIDER", "").lower()
    
    # Try Ollama first if configured
    if ai_provider == "ollama":
        result = generate_captain_plan_ollama(event_data)
        if result:
            return result
    
    # Try OpenRouter if available
    # (OpenRouter integration would go here - not implemented to avoid breaking existing code)
    
    # Fallback to rule-based
    return _rule_based_captain_plan(event_data)


def get_ai_health() -> dict[str, Any]:
    """Check health of configured AI provider."""
    ai_provider = os.getenv("AI_PROVIDER", "").lower()
    
    if ai_provider == "ollama":
        return check_ollama_health()
    
    # Default response if no provider configured
    return {
        "provider": "none",
        "available": False,
        "error": "No AI provider configured. Set AI_PROVIDER environment variable.",
    }
