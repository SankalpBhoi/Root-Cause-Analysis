// Redux slice for the Copilot chat (right side) + the thunk that talks to the AI.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { analyzeText, analyzeFile, chatWithCopilot } from "../api";
import { setFormFromAI, applyUpdates } from "./formSlice";

const welcome = {
  role: "ai",
  text: "Ready to investigate. Paste the incident email / deviation report text, or attach a PDF. I will fill the RCA form, run 5 Whys + Fishbone, suggest root causes, flag missing evidence and recommend CAPA. Everything I suggest is a draft - please review and confirm it.",
};

// Called when the user sends text or a file
export const sendToCopilot = createAsyncThunk(
  "chat/send",
  async ({ text, file }, { dispatch, getState }) => {
    const analyzed = getState().chat.analyzed;

    // Case 1: a PDF was attached
    if (file) {
      const res = await analyzeFile(file);
      dispatch(setFormFromAI(res.form));
      return { reply: `PDF analysis complete. I extracted the details from "${res.filename}" and populated the form. Please review the suggested root causes and CAPA.`, analyzed: true };
    }

    // Case 2: first message, or a long pasted report -> run full analysis
    if (!analyzed || text.length > 500) {
      const res = await analyzeText(text);
      dispatch(setFormFromAI(res.form));
      return { reply: "Incident analyzed. I filled the form, ran the root cause analysis and drafted CAPA recommendations. Root causes are suggestions until you confirm them.", analyzed: true };
    }

    // Case 3: short message after analysis -> correction / question
    const res = await chatWithCopilot(text, getState().form.data);
    if (Object.keys(res.updates).length > 0) dispatch(applyUpdates(res.updates));
    return { reply: res.reply, analyzed: true };
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: { messages: [welcome], loading: false, analyzed: false },
  reducers: {
    addUserMessage(state, action) {
      state.messages.push({ role: "user", ...action.payload });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendToCopilot.pending, (s) => { s.loading = true; })
      .addCase(sendToCopilot.fulfilled, (s, a) => {
        s.loading = false;
        s.analyzed = a.payload.analyzed;
        s.messages.push({ role: "ai", text: a.payload.reply });
      })
      .addCase(sendToCopilot.rejected, (s, a) => {
        s.loading = false;
        s.messages.push({ role: "ai", text: "Sorry, something failed: " + a.error.message });
      });
  },
});

export const { addUserMessage } = chatSlice.actions;
export default chatSlice.reducer;
