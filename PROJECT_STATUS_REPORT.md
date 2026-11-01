# ReliefHub — Current Project Status Report

## 1. Project overview
- Name/purpose: ReliefHub — Flood Relief Coordination Dashboard (Pandas-Bros hackathon). Manages camps, needs, inventory, dispatches, donations, volunteers.
- Frontend: React 19.3.1, Vite 8.3.4, Tailwind 3.4.19, React Router 7.18.4, Axios 1.20.0, Recharts 3.10.1, Lucide 1.60.0.
- Backend: Express 5.3.0 (server.cjs), bcrypt 6.0.0, cors 2.8.6, Node 24.14.0. README claims JSON Server but actual backend is Express.
- Storage: JSON file public/db/db.json (camps, inventory, needs, dispatches, donations, volunteers). No DB engine.
- Communication: Frontend Axios -> Express (port 3001) -> fs read/write db.json. Frontend env VITE_API_URL (default localhost:3001).

## 2. Functionality status
- Admin login: implemented (demo, localStorage-based via AuthContext; not JWT).
- Volunteer login: implemented (POST /auth/volunteer/login, bcrypt compare, token base64).
- Admin dashboard: implemented (KPI cards, charts).
- Camps/details: implemented CRUD.
- Needs/fulfillment: implemented.
- Inventory/stock reservations: implemented (dispatch deducts stock).
- Dispatches/statuses: implemented (Pending->In Transit->Delivered/Cancelled, fulfillment update, stock restore on cancel).
- Donations: implemented (cash + in-kind inventory update).
- Volunteer mgmt/assignments: implemented.
- Volunteer dashboard/navigation: implemented (VolunteerLayout, view-only).

## 3. Auth & authorization
- Volunteer endpoints validate email/password, bcrypt hash, camp assignment, closed-camp check.
- Token: base64 JSON with 24h expiry (not signed).
- Frontend AuthContext + ProtectedRoute role/permission guards.
- Backend role-based auth minimal; admin not separately authenticated server-side (demo). Security limitations: hardcoded demo creds in frontend/docs, unsigned tokens, no CSRF, single-user.

## 4. Data & relationships
- Camps: id, name, district, capacity, current_families, status, created_at.
- Needs: id, camp_id, inventory_item_id, required_quantity, priority, fulfilled_quantity.
- Inventory: id, name, category, unit, stock, reorder_level, created_at.
- Dispatches: id, camp_id, need_id, quantity, status, created_at, delivered_at/cancelled_at.
- Donations: id, type, amount_or_quantity, item_id, category, donor, created_at.
- Volunteers: id, name, skill, camp_id, email, password_hash, created_at.
- Calculations: occupancy=current/capacity; remaining demand=required-fulfilled-activeDispatch; available stock=inventory stock (already deducted); delivered increases fulfilled; cancelled restores stock. Avoid double counting via active dispatch subtraction.
- Data quality: dispatch need/camp mismatches possible; no historical risk labels.

## 5. AI/ML status
- ml-service/: CREATED (FastAPI, scoring.py baseline, tests, requirements) — implemented but not verified (no Python installed locally).
- Express risk routes: /risk/assess, /risk/explain — implemented (unverified runtime).
- Frontend RiskAssessment page + sidebar link — implemented.
- AI provider: OpenAI-compatible call, needs AI_API_KEY. No SDK dependency.
- Classification: Python service = partially implemented/unverified; Express integration = implemented; AI explanations = implemented; frontend = implemented; tests = present but not run.

## 6. Risk-assessment readiness
- Useful fields: capacity, current_families, needs (required/fulfilled/priority), inventory stock/reorder, dispatches status/quantity.
- No historical risk labels or verified outcomes -> supervised ML not feasible with genuine labels.
- Transparent scoring baseline appropriate; structure allows future sklearn model.
- Must respect need<->dispatch relationship to avoid double counting.

## 7. Setup/execution
- Frontend: npm run dev (5173); Backend: node server.cjs or npm run api (3001); both: npm run dev:all.
- Build: npm run build; Lint: npm run lint (oxlint, warnings present, no errors).
- Python: pip install -r ml-service/requirements.txt; uvicorn main:app (port 8000 default).
- Env: VITE_API_URL, PYTHON_SERVICE_URL, AI_API_KEY/OPENAI_API_KEY.
- Ports: 5173, 3001, 8000.

## 8. Testing/problems
- No test scripts in package.json. Lint passes with warnings. Build passes. Python tests not run (no Python).
- Known: unused imports, React hook deps warnings, Plus undefined in CampDetails.jsx:420, potential dispatch need/camp mismatch.

## 9. File change recommendations
- Modified: server.cjs, App.jsx, Sidebar.jsx, (new) RiskAssessment.jsx, ml-service/*.
- Preserve: dispatch.service.js, donations.service.js, calculations.js, AuthContext, all CRUD pages.

## 10. Handoff summary
- State: Functional relief dashboard + unverified AI risk feature added.
- Working: CRUD, auth demo, dispatch/stock logic, donations, volunteers.
- Incomplete/unverified: Python service, risk routes runtime, AI explanations.
- AI/ML: transparent scoring only, no trained model.
- Data readiness: sufficient operational indicators, no labels.
- Risks: demo auth, unsigned tokens, data mismatches, no tests.
- Next step: install Python, run ml-service tests, verify end-to-end, fix lint warnings.
