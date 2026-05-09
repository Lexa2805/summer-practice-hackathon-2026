#!/usr/bin/env python3
"""
Quick test script for Ollama integration.
Run this after starting the backend to verify Ollama endpoints work.
"""

import httpx
import json

BASE_URL = "http://127.0.0.1:8000"


def test_health():
    """Test the AI health endpoint."""
    print("Testing /ai/local/health...")
    try:
        response = httpx.get(f"{BASE_URL}/ai/local/health", timeout=10.0)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_explain_match():
    """Test the explain match endpoint with mock data."""
    print("\nTesting /ai/explain-match...")
    # Note: This requires a valid group_id from your database
    # Replace with an actual group ID from your system
    payload = {
        "group_id": "test-group-id"
    }
    try:
        response = httpx.post(
            f"{BASE_URL}/ai/explain-match",
            json=payload,
            timeout=30.0
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_captain_plan():
    """Test the captain plan endpoint with mock data."""
    print("\nTesting /ai/captain-plan...")
    # Note: This requires valid group_id and event_id from your database
    # Replace with actual IDs from your system
    payload = {
        "group_id": "test-group-id",
        "event_id": "test-event-id"
    }
    try:
        response = httpx.post(
            f"{BASE_URL}/ai/captain-plan",
            json=payload,
            timeout=30.0
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Ollama Integration Test")
    print("=" * 60)
    print("\nMake sure:")
    print("1. Ollama is running (ollama serve)")
    print("2. Model is installed (ollama pull llama3.2:1b)")
    print("3. Backend is running (uvicorn main:app)")
    print("4. .env has AI_PROVIDER=ollama")
    print("=" * 60)
    
    results = []
    
    # Test health endpoint
    results.append(("Health Check", test_health()))
    
    print("\n" + "=" * 60)
    print("Note: explain-match and captain-plan tests require valid IDs")
    print("Update the script with real group_id and event_id to test")
    print("=" * 60)
    
    # Uncomment these when you have valid IDs:
    # results.append(("Explain Match", test_explain_match()))
    # results.append(("Captain Plan", test_captain_plan()))
    
    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {name}")
    print("=" * 60)
