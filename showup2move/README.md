# ShowUp2Move

ShowUp2Move is a hackathon MVP for spontaneous sports matching. Users can create a profile, select sports, answer "ShowUpToday?", get matched into sport-sized groups, chat with a group, and create manual events.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui-style components
- Backend: FastAPI, Python, python-dotenv
- Database/Auth/Storage/Realtime: Supabase
- Package managers: npm for frontend, pip/venv for backend

## Project Structure

```text
showup2move/
  frontend/
  backend/
  README.md
  .gitignore
```

## Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run `backend/database_schema.sql`.
3. Copy `frontend/.env.example` to `frontend/.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
4. Copy `backend/.env.example` to `backend/.env` and fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL=http://localhost:3000`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL=google/gemini-2.0-flash-001`
   - `OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-001`

To get an OpenRouter key, create an account at `https://openrouter.ai/`, open the API Keys page, create a key, and paste it into `backend/.env` as `OPENROUTER_API_KEY`. Keep this key backend-only; never add it to `frontend/.env.local`.
5. Run the backend:

```bash
cd showup2move/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

6. Test the backend:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/sports`

`/sports` reads from the Supabase `sports` table. If `.env` is missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`, it returns a clear 500 configuration error instead of crashing at startup.

7. Run the frontend:

```bash
cd showup2move/frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## MVP Test Flow

1. Open `http://localhost:3000/login`.
2. Register with an email and password. If your Supabase project requires email confirmation, confirm the email before logging in.
3. After login, create a profile at `/profile` with full name, username, description, city, and any optional coordinates.
4. Select one or more sports and choose a skill level for each sport.
5. Open `/showup`, click **Yes** or **No**, and confirm the saved status message.
6. Click **Run matcher**. The frontend calls `POST http://127.0.0.1:8000/match/run`.
7. Open `/dashboard` to see real counts for selected sports, groups, events, name, and city.
8. Open `/groups` to see groups for the current user and confirm participation.

For quick API checks:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/sports
```

## Demo Mode

The app includes mock/fallback data when Supabase or the FastAPI server is unavailable. That means the frontend can still render profiles, sports, groups, events, and chat placeholders during a demo.

## Backend Routes

- `GET /health`
- `POST /profiles`
- `GET /profiles/{user_id}`
- `POST /availability`
- `GET /availability/{user_id}`
- `GET /sports`
- `POST /match/run`
- `POST /groups`
- `DELETE /groups/{group_id}`
- `GET /groups/{user_id}`
- `POST /groups/{group_id}/confirm`
- `POST /groups/{group_id}/decline`
- `POST /groups/{group_id}/members`
- `GET /groups/{group_id}/messages`
- `POST /groups/{group_id}/messages`
- `GET /users/available`
- `GET /users/search`
- `POST /events`
- `GET /events`
- `GET /events/{event_id}`
- `GET /events/{event_id}/calendar.ics`
- `DELETE /events/{event_id}`
- `POST /events/{event_id}/invites`
- `GET /invites/{token}`
- `POST /invites/{token}/accept`
- `GET /events/{event_id}/messages`
- `POST /events/{event_id}/messages`
- `GET /weather/recommendation`
- `POST /teams/balance`
- `GET /achievements/{user_id}`
- `POST /achievements/check/{user_id}`
- `GET /fitness/{user_id}`
- `POST /fitness/{user_id}/connect-demo`
- `POST /fitness/{user_id}/disconnect-demo`
- `GET /notifications/{user_id}`
- `POST /notifications/{notification_id}/read`
- `POST /notifications/{user_id}/read-all`
- `POST /ai/extract-interests`
- `POST /ai/extract-photo-interests`
- `POST /ai/compatibility-score`
- `POST /ai/teammate-recommendations`

The matching service fetches available users, groups them by sport, respects `min_players` and `max_players`, assigns a random captain, and creates `groups` plus `group_members` records when Supabase is configured.

## Group Management & Database Migrations

**New Migration:**
Run `backend/migrations/003_group_management.sql` in your Supabase SQL Editor.
This migration adds `name`, `description`, and `city` columns to the `groups` table.

**How to Test Group Management:**
1. Open the `/groups` page.
2. **Create Group:** Click "Create new group" on the right side panel. Fill out the name, sport, and city. It will appear on the left.
3. **Delete Group:** If you created the group, you are the captain. Click the "Delete group" button on the group card to remove it.
4. **Add People:** Click "Add people" on the group card. Search for a user by name or city, and click "Add".
5. **Find Teammate with AI:** Click "Find teammate with AI" on the group card. It uses OpenRouter (or fallback if unavailable) to recommend available users in the same city for that sport. Click "Add" on a recommended user.

## Bonus Features Migration

Run `backend/migrations/002_bonus_features.sql` in your Supabase SQL Editor.
This adds achievements, invites, demo fitness integrations, and optional weather/calendar fields on events.

## Bonus Features Test Checklist

1. **Calendar export:** Open `/events`, click "Add to calendar" on any event that has a time. It downloads an `.ics` file.
2. **Weather fallback:** Open `/events`, click "Check" in the weather box for outdoor sports. Without `OPENWEATHER_API_KEY` it uses deterministic fallback.
3. **Team balancing:** Open `/groups`, click "Balance teams" on a group card. Teams are generated with average skill.
4. **Achievements:** Mark availability, create a group/event, or send a message. Watch for achievement toasts and see the Achievements panel on dashboard/profile.
5. **Language switcher:** Use EN/RO toggle in the navbar; main navigation labels and key buttons update.
6. **Invite links:** Open `/events`, click "Invite friend", generate a link and open it at `/invite/{token}`. Accept invite.
7. **Fitness demo:** Open `/profile`, connect a demo provider, see mock steps and last sync.

## AI Features

OpenRouter powers the hackathon AI features from the FastAPI backend:

- profile description sport extraction
- profile photo sport clue analysis
- teammate compatibility scoring
- smart teammate recommendations

If `OPENROUTER_API_KEY` is missing or OpenRouter fails, the backend uses simple keyword and scoring fallbacks so the demo keeps working.

Test the AI endpoints in Swagger at `http://127.0.0.1:8000/docs`:

- `POST /ai/extract-interests`
- `POST /ai/extract-photo-interests`
- `POST /ai/compatibility-score`
- `POST /ai/teammate-recommendations`

Local AI can be added later as an optional future improvement.

## Backend Notes

The backend is intentionally simple for hackathon work:

- `backend/main.py` owns the single `FastAPI` app instance.
- `backend/app/api/routes.py` contains the routes.
- `backend/app/core/supabase.py` contains the reusable Supabase client helper.
- Keep one virtual environment in `backend/.venv/`; both `.venv/` and `venv/` are ignored by Git.

## Next Steps

- Connect Supabase Auth in `frontend/lib/supabase.ts`.
- Add realtime group chat subscriptions with Supabase Realtime.
- Add optional local AI as a future offline fallback.
- Add venue maps, group voting, and weather-aware recommendations.
