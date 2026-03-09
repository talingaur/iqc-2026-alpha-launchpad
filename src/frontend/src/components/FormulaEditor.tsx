import {
  type ChangeEvent,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorPositionChange: (pos: number) => void;
}

export interface FormulaEditorHandle {
  insertAtCursor: (text: string) => void;
  focus: () => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightFormula(code: string): string {
  const escaped = escapeHtml(code);

  type Token = { start: number; end: number; color: string; raw: string };
  const tokens: Token[] = [];

  const addTokens = (regex: RegExp, color: string) => {
    let match: RegExpExecArray | null = regex.exec(escaped);
    while (match !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const overlaps = tokens.some((t) => !(end <= t.start || start >= t.end));
      if (!overlaps) {
        tokens.push({ start, end, color, raw: match[0] });
      }
      match = regex.exec(escaped);
    }
  };

  // Order matters: most specific first
  addTokens(/ts_rank/g, "#06b6d4");
  addTokens(/group_neutralize/g, "#a855f7");
  addTokens(/decay_linear/g, "#f97316");
  addTokens(/(?<!ts_)rank/g, "#22c55e");
  addTokens(
    /ts_corr|ts_mean|ts_std|ts_sum|ts_max|ts_min|ts_zscore|ts_delta|ts_delay|adv|returns|close|open|high|low|volume|cap|sector|industry|subindustry|market|signed_power|log|abs|sign|divide|subtract|add|multiply|power|sqrt|min|max|indneutralize|winsorize|pasteurize|truncate|densify|normalize|scale/g,
    "#67e8f9",
  );
  addTokens(/\b\d+(\.\d+)?\b/g, "#fbbf24");
  addTokens(/[(),]/g, "#94a3b8");

  tokens.sort((a, b) => a.start - b.start);

  // Default color for unmatched text (identifiers, custom names, operators like * / + -)
  const DEFAULT_COLOR = "#e2e8f0";

  let result = "";
  let cursor = 0;
  for (const token of tokens) {
    if (token.start > cursor) {
      result += `<span style="color:${DEFAULT_COLOR}">${escaped.slice(cursor, token.start)}</span>`;
    }
    result += `<span style="color:${token.color}">${token.raw}</span>`;
    cursor = token.end;
  }
  if (cursor < escaped.length) {
    result += `<span style="color:${DEFAULT_COLOR}">${escaped.slice(cursor)}</span>`;
  }

  return result;
}

const FONT_STYLE = {
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
  fontSize: "13.5px",
  lineHeight: "1.75",
  letterSpacing: "0.01em",
  padding: "16px 18px",
} as const;

const FormulaEditor = forwardRef<FormulaEditorHandle, FormulaEditorProps>(
  ({ value, onChange, onCursorPositionChange }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertAtCursor = useCallback(
      (text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.slice(0, start) + text + value.slice(end);
        onChange(newValue);

        requestAnimationFrame(() => {
          textarea.selectionStart = start + text.length;
          textarea.selectionEnd = start + text.length;
          textarea.focus();
        });
      },
      [value, onChange],
    );

    useImperativeHandle(ref, () => ({
      insertAtCursor,
      focus: () => textareaRef.current?.focus(),
    }));

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    const handleSelect = useCallback(() => {
      if (textareaRef.current) {
        onCursorPositionChange(textareaRef.current.selectionStart);
      }
    }, [onCursorPositionChange]);

    const highlighted = highlightFormula(value);

    return (
      <div className="flex flex-col gap-2">
        {/* Editor label row */}
        <div className="flex items-center justify-between px-0.5">
          <span className="section-label">Formula Editor</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: "#22c55e",
                boxShadow: "0 0 5px rgba(34,197,94,0.7)",
              }}
            />
            <span
              className="text-[11px] font-mono"
              style={{ color: "var(--muted-text)" }}
            >
              WQ Brain syntax
            </span>
          </div>
        </div>

        {/* Editor surface — CSS focus-within handles the glow ring */}
        <div
          className="editor-wrapper editor-dot-grid relative rounded-lg overflow-hidden"
          style={{
            backgroundColor: "var(--editor-bg)",
            border: "1px solid var(--border-color)",
            minHeight: "280px",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {/* Syntax highlight overlay */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              overflow: "hidden",
              color: "transparent",
              zIndex: 0,
              ...FONT_STYLE,
            }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting requires controlled HTML rendering
            dangerouslySetInnerHTML={{ __html: `${highlighted}\u200b` }}
          />

          {/* Invisible textarea on top */}
          <textarea
            ref={textareaRef}
            data-ocid="editor.editor"
            value={value}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyUp={handleSelect}
            onClick={handleSelect}
            placeholder="Enter your WorldQuant Brain alpha formula here..."
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "transparent",
              color: "transparent",
              caretColor: "#cbd5e1",
              zIndex: 1,
              resize: "none",
              outline: "none",
              border: "none",
              width: "100%",
              height: "100%",
              minHeight: "280px",
              overflow: "auto",
              ...FONT_STYLE,
            }}
          />

          {/* Placeholder shown when value is empty */}
          {value === "" && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
                color: "#2a2e42",
                whiteSpace: "pre-wrap",
                ...FONT_STYLE,
              }}
            >
              {
                "Enter your WorldQuant Brain alpha formula here...\n\nExample:\nrank(ts_rank(close, 20) - ts_mean(close, 60)) * group_neutralize(returns, sector)"
              }
            </div>
          )}
        </div>
      </div>
    );
  },
);

FormulaEditor.displayName = "FormulaEditor";

export default FormulaEditor;
