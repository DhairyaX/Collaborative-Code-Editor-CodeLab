import type { EditorLanguage } from "../hooks/useEditorState";

type LanguageSwitcherProps = {
  value: EditorLanguage;
  onChange: (language: EditorLanguage) => void;
};

export function LanguageSwitcher({ value, onChange }: LanguageSwitcherProps) {
  return (
    <label className="flex items-center gap-3 text-sm text-slate-200">
      <span className="font-medium">Language</span>
      <select
        aria-label="Select editor language"
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
        value={value}
        onChange={(event) => onChange(event.target.value as EditorLanguage)}
      >
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="c">C</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
      </select>
    </label>
  );
}
