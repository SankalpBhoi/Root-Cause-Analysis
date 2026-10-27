// // All calls to the FastAPI backend are here.
// async function handle(res) {
//   if (!res.ok) {
//     const err = await res.json().catch(() => ({}));
//     throw new Error(err.detail || "Something went wrong");
//   }
//   return res.json();
// }

// export const analyzeText = (text) =>
//   fetch("/api/copilot/analyze", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ text }),
//   }).then(handle);

// export const analyzeFile = (file) => {
//   const data = new FormData();
//   data.append("file", file);
//   return fetch("/api/copilot/analyze-file", { method: "POST", body: data }).then(handle);
// };

// export const chatWithCopilot = (message, form) =>
//   fetch("/api/copilot/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ message, form }),
//   }).then(handle);

// export const saveInvestigation = (form) =>
//   fetch("/api/investigations", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ form }),
//   }).then(handle);

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

// Handle API responses and display useful errors.
async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const analyzeText = (text) =>
  fetch(`${API_BASE_URL}/api/copilot/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).then(handle);

export const analyzeFile = (file) => {
  const data = new FormData();
  data.append("file", file);

  return fetch(`${API_BASE_URL}/api/copilot/analyze-file`, {
    method: "POST",
    body: data,
  }).then(handle);
};

export const chatWithCopilot = (message, form) =>
  fetch(`${API_BASE_URL}/api/copilot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, form }),
  }).then(handle);

export const saveInvestigation = (form) =>
  fetch(`${API_BASE_URL}/api/investigations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form }),
  }).then(handle);
