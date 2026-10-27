"""FastAPI backend - all API endpoints live here."""
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Investigation
from .pdf_utils import pdf_to_text
from .graph import analysis_graph, chat_graph

Base.metadata.create_all(bind=engine)  # creates the table if it doesn't exist

app = FastAPI(title="AIVOA RCA Module")
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],  # React dev server
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://root-cause-analysis-bpas.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- request shapes ----------
class AnalyzeRequest(BaseModel):
    text: str


class ChatRequest(BaseModel):
    message: str
    form: dict


class SaveRequest(BaseModel):
    form: dict


# ---------- 1. AI: analyze pasted text / email ----------
@app.post("/api/copilot/analyze")
def analyze_text(req: AnalyzeRequest):
    if len(req.text.strip()) < 20:
        raise HTTPException(400, "Please provide more incident details.")
    try:
        result = analysis_graph.invoke({"text": req.text})  # extract -> rca -> capa -> merge
    except Exception as e:
        print("AI ERROR:", repr(e))
        raise HTTPException(500, f"AI error: {e}")
    return {"form": result["form"]}


# ---------- 2. AI: analyze an uploaded PDF ----------
@app.post("/api/copilot/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    text = pdf_to_text(await file.read())
    if not text:
        raise HTTPException(422, "No readable text in this PDF (it may be a scan).")
    try:
        result = analysis_graph.invoke({"text": text})
    except Exception as e:
        print("AI ERROR:", repr(e))
        raise HTTPException(500, f"AI error: {e}")
    return {"form": result["form"], "filename": file.filename}


# ---------- 3. AI: chat corrections ("batch number is BMX240602") ----------
@app.post("/api/copilot/chat")
def chat(req: ChatRequest):
    try:
        result = chat_graph.invoke({"message": req.message, "form": req.form})
    except Exception as e:
        print("AI ERROR:", repr(e))
        raise HTTPException(500, f"AI error: {e}")
    return {"reply": result["reply"], "updates": result["updates"]}


# ---------- 4. Save the (human reviewed) investigation ----------
@app.post("/api/investigations")
def save_investigation(req: SaveRequest, db: Session = Depends(get_db)):
    f = req.form
    row = Investigation(
        deviation_id=f.get("deviation_id"),
        title=f.get("title"),
        product_name=f.get("product_name"),
        batch_number=f.get("batch_number"),
        severity=f.get("severity"),
        data=f,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "Investigation saved"}


@app.get("/api/investigations")
def list_investigations(db: Session = Depends(get_db)):
    rows = db.query(Investigation).order_by(Investigation.id.desc()).all()
    return [
        {"id": r.id, "deviation_id": r.deviation_id, "title": r.title,
         "product_name": r.product_name, "batch_number": r.batch_number,
         "severity": r.severity, "created_at": r.created_at}
        for r in rows
    ]


@app.get("/api/investigations/{inv_id}")
def get_investigation(inv_id: int, db: Session = Depends(get_db)):
    row = db.get(Investigation, inv_id)
    if not row:
        raise HTTPException(404, "Not found")
    return {"id": row.id, "form": row.data}