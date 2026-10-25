import { useDispatch, useSelector } from "react-redux";
import { setField } from "../store/formSlice";

// One reusable input. It reads its value from Redux and writes changes back to Redux.
export default function Field({ name, label, type = "input", options = [], placeholder = "Awaiting AI extraction..." }) {
  const dispatch = useDispatch();
  const value = useSelector((s) => s.form.data[name]) ?? "";
  const onChange = (e) => dispatch(setField({ name, value: e.target.value }));

  return (
    <label className="field">
      <span className="label">{label}</span>
      {type === "textarea" ? (
        <textarea rows={3} value={value} onChange={onChange} placeholder={placeholder} />
      ) : type === "select" ? (
        <select value={value} onChange={onChange}>
          <option value="">Awaiting AI classification...</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input value={value} onChange={onChange} placeholder={placeholder} />
      )}
    </label>
  );
}
