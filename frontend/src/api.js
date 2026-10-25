// All calls to the FastAPI backend are here.
async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Something went wrong");
  }
  return res.json();
}

export const analyzeText = (text) =>
  fetch("/api/copilot/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).then(handle);

export const analyzeFile = (file) => {
  const data = new FormData();
  data.append("file", file);
  return fetch("/api/copilot/analyze-file", { method: "POST", body: data }).then(handle);
};

export const chatWithCopilot = (message, form) =>
  fetch("/api/copilot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, form }),
  }).then(handle);

export const saveInvestigation = (form) =>
  fetch("/api/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form }),
  }).then(handle);
