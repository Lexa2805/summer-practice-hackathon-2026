#!/usr/bin/env python3
"""Check which routes are registered in the FastAPI app."""

from main import app

print("Registered routes:")
print("=" * 80)
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        methods = ', '.join(route.methods)
        print(f"{methods:10} {route.path}")
print("=" * 80)

# Check for our new AI routes
ai_routes = [r for r in app.routes if hasattr(r, 'path') and '/ai/' in r.path]
print(f"\nFound {len(ai_routes)} AI routes:")
for route in ai_routes:
    if hasattr(route, 'methods'):
        methods = ', '.join(route.methods)
        print(f"  {methods:10} {route.path}")
