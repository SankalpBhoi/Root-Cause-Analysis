# AIVOA – AI-Powered Root Cause Analysis (RCA) Module

Same idea as the Customer Complaint demo video: **form on the left, "AIVOA Copilot" chat on the right.**
You paste an incident email / attach a PDF → AI fills the form → you chat to correct it → you review → Save.

**Stack:** React + Redux Toolkit | Python FastAPI | LangGraph + Groq | PostgreSQL (or MySQL)

---------------------------------------------------------------------
## 1. How to run (3 steps)

### Step A – Database (PostgreSQL)
    docker compose up -d
(No Docker? Install PostgreSQL yourself and create a database called `rca_db`. MySQL also works – see .env.example.)

### Step B – Backend
    cd backend
    python -m venv venv
    source venv/bin/activate          # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cp .env.example .env              # then open .env and paste your GROQ_API_KEY
    uvicorn app.main:app --reload --port 8000

### Step C – Frontend (new terminal)
    cd frontend
    npm install
    npm run dev
Open http://localhost:5173

**To test:** paste the text from `backend/sample_incident.txt` into the chat (or print it to PDF and attach it).
Then try a correction in chat: *"sorry, the batch number is MFH260712B and quantity is 30 kg"*.

---------------------------------------------------------------------
## 2. Domain in 30 seconds (say this at the start of your video)
Deviation (something went wrong) → **RCA** (find WHY it happened) → **CAPA** (fix it + stop it happening again).
- **5 Whys**: keep asking "why?" until you reach the real cause.
- **Fishbone (6M)**: look for causes under Man, Machine, Method, Material, Measurement, Environment.
- **Corrective action** fixes the current problem. **Preventive action** stops future ones.
- AI root causes are only **suggestions** – a QA person must tick "confirmed" after checking evidence.

---------------------------------------------------------------------
## 3. Code explained in simple language

### Folder map
    backend/app/
      main.py       -> API endpoints (the "doors" the frontend knocks on)
      graph.py      -> LangGraph workflows (the AI brain)
      llm.py        -> one small function that calls Groq
      pdf_utils.py  -> reads text from a PDF
      database.py   -> connects to PostgreSQL
      models.py     -> the database table
    frontend/src/
      store/formSlice.js    -> Redux: the form data + save
      store/chatSlice.js    -> Redux: chat messages + "send to AI" logic
      components/RcaForm.jsx       -> the left side form
      components/CopilotPanel.jsx  -> the right side chat
      components/Field.jsx         -> one reusable input box
      api.js        -> functions that call the backend

### The end-to-end story (follow this in Video 2)
1. **User pastes text or attaches a PDF** in `CopilotPanel.jsx`. It dispatches the Redux thunk `sendToCopilot`.
2. **`chatSlice.js` decides** what to do:
   - PDF attached → `analyzeFile`
   - first message (or a long pasted report) → `analyzeText`
   - short message after analysis → `chatWithCopilot` (a correction)
3. **Backend endpoint** (`main.py`):
   - `/api/copilot/analyze-file` → `pdf_to_text()` uses `pypdf` to read the PDF, then runs the graph.
   - `/api/copilot/analyze` → runs the graph on the pasted text.
4. **LangGraph** (`graph.py`) = a chain of small steps sharing one "notebook" (the state):
   - `extract_step` – asks Groq to pull facts: product, batch, date, severity…
   - `rca_step` – asks Groq for 5 Whys, Fishbone, root causes (with confidence + evidence) and **missing evidence**
   - `capa_step` – asks Groq for Corrective/Preventive actions with a one-line reason
   - `merge_step` – joins all results into one form object. Every root cause starts as `confirmed: False`.
5. **Frontend gets the form object** → `setFormFromAI` puts it into Redux → every `Field` reads from Redux, so the left side fills automatically. Status badge turns "Ready to Review".
6. **Chat correction** → `/api/copilot/chat` runs a second, tiny graph (`update_form`). Groq returns
   `{reply, updates}`. `applyUpdates` changes only those fields in Redux (same as "BMX240602" in the video).
7. **User edits anything** → `setField` updates Redux. User ticks "confirmed" on root causes they have verified.
8. **Save Investigation** → `saveForm` thunk → `POST /api/investigations` → SQLAlchemy stores key columns
   (deviation id, product, batch, severity) + the full form as JSON in the `investigations` table.

### Why these design choices (good interview answers)
- **Prompts say "never invent facts, use 'Not Provided'"** → reduces AI hallucination.
- **Low temperature (0.2) + JSON mode** → consistent, parseable answers.
- **Root causes are unconfirmed by default** and need a human checkbox → matches the rule that AI causes are only suggestions.
- **Missing evidence list** → tells the investigator what documents to collect next.
- **JSON column for the form** → the form can grow without changing the database each time.
- **Node names end in `_step`** → LangGraph does not allow a node name equal to a state key.

### API list
| Method | URL | Purpose |
|---|---|---|
| POST | /api/copilot/analyze | pasted text/email → filled form |
| POST | /api/copilot/analyze-file | PDF → filled form |
| POST | /api/copilot/chat | chat correction → field updates |
| POST | /api/investigations | save |
| GET | /api/investigations | list saved |
| GET | /api/investigations/{id} | open one |

Note: do NOT upload this project, the videos or the assignment PDF to public GitHub (the assignment forbids it).
