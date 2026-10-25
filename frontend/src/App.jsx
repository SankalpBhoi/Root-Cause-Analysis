import RcaForm from "./components/RcaForm";
import CopilotPanel from "./components/CopilotPanel";

// Two panels side by side: form (left) + AI copilot (right)
export default function App() {
  return (
    <div className="layout">
      <RcaForm />
      <CopilotPanel />
    </div>
  );
}
