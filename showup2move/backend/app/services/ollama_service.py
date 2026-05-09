import os
from typing import Any
import httpx


def _call_ollama(messages: list[dict[str, str]], temperature: float = 0.2, timeout: float = 30.0) -> str | None:
    """Call Ollama API with chat messages and return the response content."""
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
    
    try:
        response = httpx.post(
            f"{base_url}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                }
            },
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content")
    except Exception:
        return None


def check_ollama_health() -> dict[str, Any]:
    """Check if Ollama is running and the model is available."""
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
    
    try:
        response = httpx.get(f"{base_url}/api/tags", timeout=5.0)
        response.raise_for_status()
        data = response.json()
        models = data.get("models", [])
        model_names = [m.get("name") for m in models]
        
        if model in model_names or any(model in name for name in model_names):
            return {
                "provider": "ollama",
                "available": True,
                "model": model,
            }
        else:
            return {
                "provider": "ollama",
                "available": False,
                "model": model,
                "error": f"Model {model} is not installed. Run: ollama pull {model}",
            }
    except Exception as exc:
        return {
            "provider": "ollama",
            "available": False,
            "model": model,
            "error": f"Ollama is not running or not accessible: {exc}",
        }


def explain_match_ollama(group_data: dict[str, Any]) -> dict[str, Any] | None:
    """Generate a match explanation using Ollama."""
    sport_name = group_data.get("sport_name", "this sport")
    member_count = group_data.get("member_count", 0)
    city = group_data.get("city", "your area")
    members = group_data.get("members", [])
    
    skill_levels = [m.get("skill_level", "intermediate") for m in members]
    skill_summary = ", ".join(set(skill_levels)) if skill_levels else "mixed"
    
    system_prompt = """You are a friendly sports matching assistant. Generate short, encouraging explanations for why a group of people make a good sports team. Keep responses concise and positive. Focus on practical compatibility factors."""
    
    user_prompt = f"""Explain why this {sport_name} group works well:
- {member_count} members
- Location: {city}
- Skill levels: {skill_summary}

Provide:
1. A catchy title (max 8 words)
2. 3 specific reasons why this match works (each max 15 words)
3. A brief summary (max 20 words)

Format as JSON:
{{
  "title": "...",
  "reasons": ["...", "...", "..."],
  "summary": "..."
}}"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    response = _call_ollama(messages, temperature=0.3)
    if not response:
        return None
    
    # Try to parse JSON from response
    import json
    import re
    
    # Extract JSON from markdown code blocks if present
    json_match = re.search(r"```(?:json)?\s*(.*?)```", response, re.DOTALL | re.IGNORECASE)
    if json_match:
        response = json_match.group(1).strip()
    
    # Try to find JSON object
    json_match = re.search(r"\{.*\}", response, re.DOTALL)
    if json_match:
        response = json_match.group(0)
    
    try:
        data = json.loads(response)
        return {
            "title": str(data.get("title", "Great Match!")),
            "reasons": data.get("reasons", [])[:3] if isinstance(data.get("reasons"), list) else [],
            "summary": str(data.get("summary", "This group has good compatibility.")),
            "source": "ollama",
        }
    except json.JSONDecodeError:
        return None


def generate_captain_plan_ollama(event_data: dict[str, Any]) -> dict[str, Any] | None:
    """Generate a captain coordination plan using Ollama."""
    event_title = event_data.get("title", "the event")
    sport_name = event_data.get("sport_name", "sport")
    location = event_data.get("location_name", "the venue")
    event_time = event_data.get("event_time", "")
    participant_count = event_data.get("participant_count", 0)
    price = event_data.get("price")
    
    system_prompt = """You are a helpful sports event coordinator. Generate practical, actionable plans for event captains to organize their sports events. Keep advice short, specific, and friendly."""
    
    user_prompt = f"""Create a coordination plan for this {sport_name} event:
- Event: {event_title}
- Location: {location}
- Time: {event_time}
- Participants: {participant_count}
- Price: {price if price else "Free"}

Provide:
1. A checklist of 4-5 action items for the captain (each max 12 words)
2. A friendly message the captain can send to participants (max 40 words)

Format as JSON:
{{
  "plan": ["...", "...", "...", "..."],
  "message": "..."
}}"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    response = _call_ollama(messages, temperature=0.3)
    if not response:
        return None
    
    # Try to parse JSON from response
    import json
    import re
    
    # Extract JSON from markdown code blocks if present
    json_match = re.search(r"```(?:json)?\s*(.*?)```", response, re.DOTALL | re.IGNORECASE)
    if json_match:
        response = json_match.group(1).strip()
    
    # Try to find JSON object
    json_match = re.search(r"\{.*\}", response, re.DOTALL)
    if json_match:
        response = json_match.group(0)
    
    try:
        data = json.loads(response)
        return {
            "plan": data.get("plan", [])[:5] if isinstance(data.get("plan"), list) else [],
            "message": str(data.get("message", "Looking forward to the event!")),
            "source": "ollama",
        }
    except json.JSONDecodeError:
        return None
