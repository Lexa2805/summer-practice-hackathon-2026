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
- `GET /groups/{user_id}`
- `POST /groups/{group_id}/confirm`
- `POST /events`
- `GET /events`
- `POST /ai/extract-interests`
- `POST /ai/compatibility-score`

The matching service fetches available users, groups them by sport, respects `min_players` and `max_players`, assigns a random captain, and creates `groups` plus `group_members` records when Supabase is configured.

## Backend Notes

The backend is intentionally simple for hackathon work:

- `backend/main.py` owns the single `FastAPI` app instance.
- `backend/app/api/routes.py` contains the routes.
- `backend/app/core/supabase.py` contains the reusable Supabase client helper.
- Keep one virtual environment in `backend/.venv/`; both `.venv/` and `venv/` are ignored by Git.

## Next Steps

- Connect Supabase Auth in `frontend/lib/supabase.ts`.
- Add realtime group chat subscriptions with Supabase Realtime.
- Replace local AI placeholders with OpenAI or OpenRouter calls.
- Add venue maps, group voting, and weather-aware recommendations.
