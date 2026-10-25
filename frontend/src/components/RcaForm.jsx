import { useDispatch, useSelector } from "react-redux";
import { setField, saveForm } from "../store/formSlice";
import Field from "./Field";

const STATUS_CLASS = { "Pending Analysis": "pending", "Ready to Review": "ready", Saved: "ready" };
const FISHBONE_LABELS = {
  man: "Man (People)", machine: "Machine (Equipment)", method: "Method (Process)",
  material: "Material", measurement: "Measurement", environment: "Environment",
};

// ---------- editor for a simple list of strings (5 Whys, factors, missing evidence) ----------
function StringList({ name, label, addText }) {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.form.data[name]);
  const update = (list) => dispatch(setField({ name, value: list }));
  return (
    <div className="block">
      {label && <div className="label">{label}</div>}
      {items.map((item, i) => (
        <div className="row-item" key={i}>
          {name === "five_whys" && <span className="why">Why {i + 1}</span>}
          <textarea rows={2} value={item} onChange={(e) => update(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button className="x-btn" onClick={() => update(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="link-btn" onClick={() => update([...items, ""])}>+ {addText}</button>
    </div>
  );
}

// ---------- fishbone: 6 boxes, one cause per line ----------
function Fishbone() {
  const dispatch = useDispatch();
  const fishbone = useSelector((s) => s.form.data.fishbone);
  const update = (key, text) =>
    dispatch(setField({ name: "fishbone", value: { ...fishbone, [key]: text.split("\n") } }));
  return (
    <div className="grid2">
      {Object.keys(FISHBONE_LABELS).map((key) => (
        <label className="field" key={key}>
          <span className="label">{FISHBONE_LABELS[key]}</span>
          <textarea rows={3} placeholder="One cause per line" value={(fishbone[key] || []).join("\n")} onChange={(e) => update(key, e.target.value)} />
        </label>
      ))}
    </div>
  );
}

// ---------- root causes: AI suggestion + human confirmation ----------
function RootCauses() {
  const dispatch = useDispatch();
  const causes = useSelector((s) => s.form.data.root_causes);
  const update = (list) => dispatch(setField({ name: "root_causes", value: list }));
  const change = (i, key, value) => update(causes.map((c, j) => (j === i ? { ...c, [key]: value } : c)));
  return (
    <div className="block">
      {causes.length === 0 && <div className="muted small">Awaiting AI analysis...</div>}
      {causes.map((c, i) => (
        <div className={`card ${c.confirmed ? "confirmed" : ""}`} key={i}>
          <div className="card-top">
            <span className={`tag ${c.confirmed ? "tag-green" : "tag-yellow"}`}>
              {c.confirmed ? "Confirmed by QA" : "AI suggestion - not confirmed"}
            </span>
            <button className="x-btn" onClick={() => update(causes.filter((_, j) => j !== i))}>✕</button>
          </div>
          <textarea rows={2} value={c.cause} onChange={(e) => change(i, "cause", e.target.value)} />
          <div className="grid3">
            <label className="field"><span className="label">Category</span>
              <input value={c.category || ""} onChange={(e) => change(i, "category", e.target.value)} /></label>
            <label className="field"><span className="label">AI confidence</span>
              <select value={c.confidence || "Low"} onChange={(e) => change(i, "confidence", e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option></select></label>
          </div>
          <label className="field"><span className="label">Supporting evidence</span>
            <textarea rows={2} value={c.evidence || ""} onChange={(e) => change(i, "evidence", e.target.value)} /></label>
          <label className="check">
            <input type="checkbox" checked={!!c.confirmed} onChange={(e) => change(i, "confirmed", e.target.checked)} />
            I have reviewed the evidence and confirm this root cause
          </label>
        </div>
      ))}
      <button className="link-btn" onClick={() => update([...causes, { cause: "", category: "", confidence: "Low", evidence: "", confirmed: false }])}>+ Add root cause</button>
    </div>
  );
}

// ---------- CAPA ----------
function Capa() {
  const dispatch = useDispatch();
  const capa = useSelector((s) => s.form.data.capa);
  const update = (list) => dispatch(setField({ name: "capa", value: list }));
  const change = (i, key, value) => update(capa.map((c, j) => (j === i ? { ...c, [key]: value } : c)));
  return (
    <div className="block">
      {capa.length === 0 && <div className="muted small">Awaiting AI recommendations...</div>}
      {capa.map((c, i) => (
        <div className="card" key={i}>
          <div className="card-top">
            <select className="small-select" value={c.type} onChange={(e) => change(i, "type", e.target.value)}>
              <option>Corrective</option><option>Preventive</option>
            </select>
            <button className="x-btn" onClick={() => update(capa.filter((_, j) => j !== i))}>✕</button>
          </div>
          <textarea rows={2} value={c.action} onChange={(e) => change(i, "action", e.target.value)} />
          <div className="why-box">💡 <input value={c.explanation || ""} onChange={(e) => change(i, "explanation", e.target.value)} /></div>
          <div className="grid2">
            <label className="field"><span className="label">Owner</span>
              <input value={c.owner || ""} onChange={(e) => change(i, "owner", e.target.value)} /></label>
            <label className="field"><span className="label">Due</span>
              <input value={c.due || ""} onChange={(e) => change(i, "due", e.target.value)} /></label>
          </div>
        </div>
      ))}
      <button className="link-btn" onClick={() => update([...capa, { type: "Corrective", action: "", explanation: "", owner: "", due: "" }])}>+ Add CAPA</button>
    </div>
  );
}

// ---------- the whole form ----------
export default function RcaForm() {
  const dispatch = useDispatch();
  const { status, saving, savedId, error } = useSelector((s) => s.form);
  const analyzed = status !== "Pending Analysis";

  return (
    <main className="form-panel">
      <div className="form-head">
        <div>
          <h1>Root Cause Analysis</h1>
          <div className="muted small">API Quality Assurance Module</div>
        </div>
        <span className={`badge ${STATUS_CLASS[status]}`}>● {status}</span>
      </div>

      <h3 className="section">1. Deviation identification</h3>
      <div className="grid2">
        <Field name="deviation_id" label="Deviation ID" />
        <Field name="date_of_occurrence" label="Date of occurrence" />
        <Field name="title" label="Title" />
        <Field name="reported_by" label="Reported by" />
      </div>

      <h3 className="section">2. Product & batch</h3>
      <div className="grid2">
        <Field name="product_name" label="Product (API)" />
        <Field name="batch_number" label="Batch / Lot number" />
        <Field name="process_stage" label="Process stage" />
        <Field name="equipment_area" label="Equipment / Area" />
        <Field name="quantity_affected" label="Quantity affected" />
      </div>

      <h3 className="section">3. Incident description</h3>
      <Field name="description" label="Structured description" type="textarea" placeholder="AI will write a formal QMS description..." />
      <Field name="immediate_action" label="Immediate containment action" type="textarea" />
      <div className="grid2">
        <Field name="severity" label="Severity (AI suggested)" type="select" options={["Critical", "Major", "Minor"]} />
        <Field name="severity_reason" label="Reason for severity" />
      </div>

      <h3 className="section">4. Investigation</h3>
      <Field name="method" label="Investigation method" type="select" options={["5 Whys", "Fishbone", "Both"]} />
      <StringList name="five_whys" label="5 Whys" addText="Add why" />
      <div className="label" style={{ marginTop: 14 }}>Fishbone (6M)</div>
      <Fishbone />

      <h3 className="section">5. Root causes <span className="hint">AI suggestions - confirm with evidence</span></h3>
      <RootCauses />
      <StringList name="contributing_factors" label="Contributing factors" addText="Add factor" />

      <h3 className="section">6. Missing evidence <span className="hint">needed before closing</span></h3>
      <StringList name="missing_evidence" label="" addText="Add item" />

      <h3 className="section">7. CAPA recommendations</h3>
      <Capa />

      {error && <div className="error">{error}</div>}
      {savedId && <div className="success">Investigation saved to database (ID #{savedId}).</div>}
      <button className="primary" disabled={!analyzed || saving} onClick={() => dispatch(saveForm())}>
        {saving ? "Saving..." : "Save Investigation"}
      </button>
    </main>
  );
}
