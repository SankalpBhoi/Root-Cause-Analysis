"""
LangGraph workflows.

1) analysis_graph  (runs when the user gives an incident document / text)
      extract_step -> rca_step -> capa_step -> merge_step
   - extract : pull the facts from the document into form fields
   - rca     : 5 Whys + Fishbone + root cause suggestions + missing evidence
   - capa    : corrective & preventive action recommendations
   - merge   : combine everything into ONE form object for the frontend

2) chat_graph  (runs when the user types a correction in the chat)
      update_form
"""
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from .llm import ask_json

SEVERITIES = "Critical, Major, Minor"
FISHBONE = ["man", "machine", "method", "material", "measurement", "environment"]


# ---------- the shared "notebook" that every node reads/writes ----------
class AnalysisState(TypedDict, total=False):
    text: str        # incident document text
    incident: dict   # output of extract node
    rca: dict        # output of rca node
    capa: list       # output of capa node
    form: dict       # final merged result


# ---------- NODE 1: extract the facts ----------
def extract_node(state: AnalysisState):
    system = (
        "You are a pharmaceutical QA assistant for an API (Active Pharmaceutical Ingredient) "
        "manufacturer. Extract facts from the incident report. NEVER invent facts. "
        "If something is not in the text, use the string 'Not Provided'. Reply ONLY with JSON."
    )
    user = f"""Incident text:
\"\"\"{state['text']}\"\"\"

Return JSON with exactly these keys:
deviation_id, title, date_of_occurrence, reported_by, product_name, batch_number,
process_stage, equipment_area, quantity_affected,
description (2-4 sentence formal QMS description),
immediate_action (containment already taken, or 'Not Provided'),
severity (one of: {SEVERITIES}), severity_reason (one short sentence)."""
    return {"incident": ask_json(system, user)}


# ---------- NODE 2: root cause analysis ----------
def rca_node(state: AnalysisState):
    system = (
        "You are a senior pharma quality investigator. Do a Root Cause Analysis using the "
        "5 Whys and Fishbone (6M) methods. Rules: only use facts from the text; every root cause "
        "is a HYPOTHESIS until a qualified person confirms it; be honest about confidence; "
        "list evidence that is still missing. Reply ONLY with JSON."
    )
    user = f"""Incident text:
\"\"\"{state['text']}\"\"\"

Extracted facts:
{state['incident']}

Return JSON with these keys:
method: "5 Whys" or "Fishbone" or "Both" (pick what suits this incident)
five_whys: list of up to 5 strings. Each string is the answer to "Why?" chained from the one before.
fishbone: object with keys {FISHBONE}; each value is a list of short possible causes (can be empty).
root_causes: list (1-3) of objects: {{"cause": str, "category": one of the 6M, "confidence": "Low"|"Medium"|"High", "evidence": "what in the text supports this, or 'No direct evidence yet'"}}
contributing_factors: list of short strings.
missing_evidence: list of specific documents/data still needed (e.g. 'Equipment cleaning log for 12 June', 'Operator training record')."""
    return {"rca": ask_json(system, user)}


# ---------- NODE 3: CAPA ----------
def capa_node(state: AnalysisState):
    system = (
        "You are a pharma CAPA specialist (ICH Q10, 21 CFR 211 / EU GMP). Recommend practical actions "
        "for the suspected root causes. Reply ONLY with JSON."
    )
    user = f"""Facts: {state['incident']}
Suspected root causes: {state['rca'].get('root_causes')}

Return JSON: {{"capa": [{{"type": "Corrective"|"Preventive", "action": str, "explanation": "one short sentence on WHY this action", "owner": "a role e.g. QA Head, Production Manager", "due": "e.g. 30 days"}}]}}
Give 3-5 actions, with at least one Corrective and one Preventive."""
    result = ask_json(system, user)
    return {"capa": result.get("capa", [])}


# ---------- NODE 4: merge into the form shape ----------
def merge_node(state: AnalysisState):
    inc, rca = state["incident"], state["rca"]
    fishbone = rca.get("fishbone", {}) or {}
    form = {
        **inc,
        "method": rca.get("method", "Both"),
        "five_whys": rca.get("five_whys", []),
        "fishbone": {k: fishbone.get(k, []) for k in FISHBONE},
        # every AI root cause starts as NOT confirmed - the human must confirm
        "root_causes": [{**rc, "confirmed": False} for rc in rca.get("root_causes", [])],
        "contributing_factors": rca.get("contributing_factors", []),
        "missing_evidence": rca.get("missing_evidence", []),
        "capa": state.get("capa", []),
    }
    return {"form": form}


def build_analysis_graph():
    g = StateGraph(AnalysisState)
    # NOTE: node names must be different from the state keys (rca, capa...), so we add "_step"
    g.add_node("extract_step", extract_node)
    g.add_node("rca_step", rca_node)
    g.add_node("capa_step", capa_node)
    g.add_node("merge_step", merge_node)
    g.add_edge(START, "extract_step")
    g.add_edge("extract_step", "rca_step")
    g.add_edge("rca_step", "capa_step")
    g.add_edge("capa_step", "merge_step")
    g.add_edge("merge_step", END)
    return g.compile()


# ====================== CHAT GRAPH ======================
class ChatState(TypedDict, total=False):
    message: str
    form: dict
    reply: str
    updates: dict


def update_form_node(state: ChatState):
    system = (
        "You are the AIVOA Copilot inside an RCA form. The user sends a message. If they are "
        "correcting or adding information, return the form fields to change. If they are asking a "
        "question, answer it using the form data and change nothing. Never invent facts. "
        "Reply ONLY with JSON."
    )
    user = f"""Current form: {state['form']}

User message: "{state['message']}"

Return JSON: {{"reply": "short friendly confirmation or answer", "updates": {{field_name: new_value}}}}
Use the SAME field names as the current form. For list fields (five_whys, root_causes, capa, ...) return the FULL new list.
If nothing should change, use "updates": {{}}."""
    result = ask_json(system, user)
    return {"reply": result.get("reply", "Done."), "updates": result.get("updates", {})}


def build_chat_graph():
    g = StateGraph(ChatState)
    g.add_node("update_form", update_form_node)
    g.add_edge(START, "update_form")
    g.add_edge("update_form", END)
    return g.compile()


analysis_graph = build_analysis_graph()
chat_graph = build_chat_graph()
