import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addUserMessage, sendToCopilot } from "../store/chatSlice";

export default function CopilotPanel() {
  const dispatch = useDispatch();
  const { messages, loading } = useSelector((s) => s.chat);
  const [text, setText] = useState("");
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  // auto scroll to the newest message
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendText = () => {
    if (!text.trim() || loading) return;
    dispatch(addUserMessage({ text }));
    dispatch(sendToCopilot({ text }));
    setText("");
  };

  const sendFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    dispatch(addUserMessage({ text: "", fileName: file.name }));
    dispatch(sendToCopilot({ text: "", file }));
    e.target.value = "";
  };

  return (
    <aside className="copilot">
      <div className="copilot-head">
        <b>AIVOA Copilot</b>
        <div className="muted small">Drop incident files or paste text below.</div>
      </div>

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            {m.fileName ? (
              <div className="file-chip">📄 {m.fileName}<span className="muted small"> PDF Document</span></div>
            ) : (
              <div className={`bubble ${m.role}`}>{m.text}</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="bubble-row ai">
            <div className="bubble ai">
              Analyzing incident (extract → root cause analysis → CAPA)...
              <div className="progress"><div className="bar" /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <input type="file" accept=".pdf" ref={fileRef} onChange={sendFile} hidden />
        <button className="icon-btn" onClick={() => fileRef.current.click()} title="Attach PDF">📎</button>
        <textarea
          rows={1}
          value={text}
          placeholder="Type a message or paste an incident report..."
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
        />
        <button className="send-btn" onClick={sendText} disabled={loading}>➤</button>
      </div>
      <div className="powered">POWERED BY LANGGRAPH + GROQ</div>
    </aside>
  );
}
