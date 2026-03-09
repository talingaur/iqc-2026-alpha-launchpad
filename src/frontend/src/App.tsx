import { useCallback, useRef, useState } from "react";
import AlphaLibrary from "./components/AlphaLibrary";
import FormulaEditor, {
  type FormulaEditorHandle,
} from "./components/FormulaEditor";
import Header from "./components/Header";
import LogicAuditor from "./components/LogicAuditor";
import OperatorSidebar from "./components/OperatorSidebar";

const SAMPLE_FORMULA =
  "rank(ts_rank(close / ts_delay(close, 5), 20) - decay_linear(returns, 10)) * group_neutralize(volume / adv(20), sector)";

export default function App() {
  const [formula, setFormula] = useState(SAMPLE_FORMULA);
  const setCursorPos = useState(0)[1];
  const editorRef = useRef<FormulaEditorHandle>(null);

  const handleInsert = useCallback((text: string) => {
    editorRef.current?.insertAtCursor(text);
  }, []);

  const handleLoad = useCallback((f: string) => {
    setFormula(f);
    setTimeout(() => editorRef.current?.focus(), 50);
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100vh",
        backgroundColor: "var(--app-bg)",
        overflow: "hidden",
      }}
    >
      {/* Header — full width */}
      <Header charCount={formula.length} />

      {/* Two-panel layout — fills remaining height */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left panel — main workspace, scrollable */}
        <main
          className="flex-1 flex flex-col overflow-y-auto"
          style={{ minWidth: 0 }}
        >
          <div className="flex flex-col gap-5 p-5">
            {/* Formula Editor */}
            <section>
              <FormulaEditor
                ref={editorRef}
                value={formula}
                onChange={setFormula}
                onCursorPositionChange={setCursorPos}
              />
            </section>

            {/* Logic Auditor */}
            <section>
              <LogicAuditor formula={formula} />
            </section>

            {/* Alpha Library divider */}
            <div
              className="flex items-center gap-3"
              style={{ marginTop: "4px" }}
            >
              <div
                className="h-px flex-1"
                style={{ backgroundColor: "var(--border-color)" }}
              />
              <span className="section-label" style={{ flexShrink: 0 }}>
                Alpha Library
              </span>
              <div
                className="h-px flex-1"
                style={{ backgroundColor: "var(--border-color)" }}
              />
            </div>

            {/* Alpha Library */}
            <section className="pb-6">
              <AlphaLibrary currentFormula={formula} onLoad={handleLoad} />
            </section>
          </div>

          {/* Footer */}
          <footer
            className="mt-auto px-5 py-2.5 text-[11px] text-center"
            style={{
              borderTop: "1px solid var(--border-color)",
              color: "var(--muted-text)",
            }}
          >
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                window.location.hostname,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-150 hover:underline"
              style={{ color: "#374464" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#60a5fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#374464";
              }}
            >
              Built with ♥ using caffeine.ai
            </a>
          </footer>
        </main>

        {/* Right panel — Operator Sidebar, fixed width */}
        <div
          className="flex-shrink-0"
          style={{
            width: "320px",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <OperatorSidebar onInsert={handleInsert} />
        </div>
      </div>
    </div>
  );
}
