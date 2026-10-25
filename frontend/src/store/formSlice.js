// Redux slice that holds the RCA form data (what you see on the left side).
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { saveInvestigation } from "../api";

export const emptyForm = {
  deviation_id: "", title: "", date_of_occurrence: "", reported_by: "",
  product_name: "", batch_number: "", process_stage: "", equipment_area: "", quantity_affected: "",
  description: "", immediate_action: "", severity: "", severity_reason: "",
  method: "Both",
  five_whys: [],
  fishbone: { man: [], machine: [], method: [], material: [], measurement: [], environment: [] },
  root_causes: [],
  contributing_factors: [],
  missing_evidence: [],
  capa: [],
};

// Save button -> POST to backend -> database
export const saveForm = createAsyncThunk("form/save", async (_, { getState }) => {
  return saveInvestigation(getState().form.data);
});

const formSlice = createSlice({
  name: "form",
  initialState: {
    data: emptyForm,
    status: "Pending Analysis", // Pending Analysis -> Ready to Review -> Saved
    saving: false,
    savedId: null,
    error: null,
  },
  reducers: {
    // user edits one field
    setField(state, action) {
      state.data[action.payload.name] = action.payload.value;
      if (state.status === "Saved") state.status = "Ready to Review";
    },
    // AI filled the whole form
    setFormFromAI(state, action) {
      state.data = { ...emptyForm, ...action.payload };
      state.status = "Ready to Review";
      state.savedId = null;
    },
    // AI changed a few fields (chat correction)
    applyUpdates(state, action) {
      state.data = { ...state.data, ...action.payload };
      if (state.status === "Saved") state.status = "Ready to Review";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveForm.pending, (s) => { s.saving = true; s.error = null; })
      .addCase(saveForm.fulfilled, (s, a) => { s.saving = false; s.status = "Saved"; s.savedId = a.payload.id; })
      .addCase(saveForm.rejected, (s, a) => { s.saving = false; s.error = a.error.message; });
  },
});

export const { setField, setFormFromAI, applyUpdates } = formSlice.actions;
export default formSlice.reducer;
