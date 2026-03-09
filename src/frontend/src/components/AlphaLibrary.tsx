import {
  BookMarked,
  CheckCheck,
  Clock,
  Copy,
  Download,
  Tag,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export interface AlphaEntry {
  id: string;
  name: string;
  category: "Cubic" | "Safety Gate" | "Custom";
  formula: string;
  savedAt: number;
}

const STORAGE_KEY = "iqc_alpha_library";

function loadFromStorage(): AlphaEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AlphaEntry[];
  } catch {
    return [];
  }
}

function saveToStorage(entries: AlphaEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // silently fail
  }
}

const CATEGORY_STYLES: Record<
  AlphaEntry["category"],
  { text: string; bg: string; border: string; glow: string }
> = {
  Cubic: {
    text: "#60a5fa",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
    glow: "rgba(59,130,246,0.12)",
  },
  "Safety Gate": {
    text: "#34d399",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
    glow: "rgba(16,185,129,0.1)",
  },
  Custom: {
    text: "#fbbf24",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    glow: "rgba(245,158,11,0.08)",
  },
};

interface AlphaLibraryProps {
  currentFormula: string;
  onLoad: (formula: string) => void;
}

export default function AlphaLibrary({
  currentFormula,
  onLoad,
}: AlphaLibraryProps) {
  const [entries, setEntries] = useState<AlphaEntry[]>(() => loadFromStorage());
  const [alphaName, setAlphaName] = useState("");
  const [category, setCategory] = useState<AlphaEntry["category"]>("Custom");
  const [nameError, setNameError] = useState("");
  const [formulaError, setFormulaError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    saveToStorage(entries);
  }, [entries]);

  const handleSave = useCallback(() => {
    setNameError("");
    setFormulaError("");

    let hasError = false;
    if (!alphaName.trim()) {
      setNameError("Please enter a name for this alpha.");
      hasError = true;
    }
    if (!currentFormula.trim()) {
      setFormulaError("Editor is empty — type a formula first.");
      hasError = true;
    }
    if (hasError) return;

    const entry: AlphaEntry = {
      id: String(Date.now()),
      name: alphaName.trim(),
      category,
      formula: currentFormula,
      savedAt: Date.now(),
    };

    setEntries((prev) => [entry, ...prev]);
    setAlphaName("");
  }, [alphaName, category, currentFormula]);

  const handleCopy = useCallback((entry: AlphaEntry) => {
    navigator.clipboard.writeText(entry.formula).then(() => {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (deletingId === id) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setDeletingId(null);
      } else {
        setDeletingId(id);
        setTimeout(
          () => setDeletingId((curr) => (curr === id ? null : curr)),
          3000,
        );
      }
    },
    [deletingId],
  );

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div data-ocid="library.section" className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <BookMarked
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: "#06b6d4" }}
        />
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "0.01em" }}
        >
          Alpha Library
        </h2>
        <span
          className="text-[11px] font-mono px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.18)",
            color: "#818cf8",
          }}
        >
          {entries.length}
        </span>
        <span
          className="ml-auto text-[11px]"
          style={{ color: "var(--muted-text)" }}
        >
          persisted · localStorage
        </span>
      </div>

      {/* Save panel */}
      <div
        className="rounded-lg p-3.5 flex flex-col gap-3"
        style={{
          backgroundColor: "var(--editor-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3" style={{ color: "var(--muted-text)" }} />
          <span className="section-label">Save Current Formula</span>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <input
              data-ocid="library.input"
              type="text"
              placeholder="Alpha name..."
              value={alphaName}
              onChange={(e) => {
                setAlphaName(e.target.value);
                if (nameError) setNameError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="w-full rounded text-xs px-3 py-2 outline-none transition-all duration-150"
              style={{
                backgroundColor: "var(--panel-bg)",
                border: `1px solid ${nameError ? "rgba(239,68,68,0.4)" : "var(--border-color)"}`,
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = nameError
                  ? "rgba(239,68,68,0.6)"
                  : "rgba(59,130,246,0.4)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(59,130,246,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = nameError
                  ? "rgba(239,68,68,0.4)"
                  : "var(--border-color)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <select
            data-ocid="library.select"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as AlphaEntry["category"])
            }
            className="rounded text-xs px-2.5 py-2 outline-none transition-all duration-150 cursor-pointer"
            style={{
              backgroundColor: "var(--panel-bg)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui)",
              minWidth: "105px",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
              e.currentTarget.style.boxShadow =
                "0 0 0 2px rgba(59,130,246,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <option value="Cubic">Cubic</option>
            <option value="Safety Gate">Safety Gate</option>
            <option value="Custom">Custom</option>
          </select>

          <button
            type="button"
            data-ocid="library.save_button"
            onClick={handleSave}
            className="px-3.5 py-2 rounded text-xs font-semibold transition-all duration-150 flex-shrink-0 flex items-center gap-1.5"
            style={{
              backgroundColor: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#93c5fd",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(59,130,246,0.2)";
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)";
              e.currentTarget.style.color = "#bfdbfe";
              e.currentTarget.style.boxShadow =
                "0 0 10px rgba(59,130,246,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(59,130,246,0.12)";
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
              e.currentTarget.style.color = "#93c5fd";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Save
          </button>
        </div>

        {(nameError || formulaError) && (
          <div className="flex flex-col gap-0.5">
            {nameError && (
              <p className="text-[11px]" style={{ color: "#f87171" }}>
                {nameError}
              </p>
            )}
            {formulaError && (
              <p className="text-[11px]" style={{ color: "#f87171" }}>
                {formulaError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Library list */}
      {entries.length === 0 ? (
        <div
          data-ocid="library.empty_state"
          className="py-10 text-center rounded-lg flex flex-col items-center gap-3"
          style={{
            backgroundColor: "var(--editor-bg)",
            border: "1px dashed var(--border-color)",
          }}
        >
          <BookMarked
            className="w-7 h-7"
            style={{ color: "var(--border-color-bright)" }}
          />
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--muted-text)" }}
            >
              No saved alphas yet.
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--muted-text)", opacity: 0.6 }}
            >
              Save your first formula above.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => {
            const catStyle = CATEGORY_STYLES[entry.category];
            const cardOcid =
              index < 3 ? `library.item.${index + 1}` : undefined;
            const copyOcid =
              index < 3 ? `library.copy_button.${index + 1}` : undefined;
            const loadOcid =
              index < 3 ? `library.load_button.${index + 1}` : undefined;
            const deleteOcid =
              index < 3 ? `library.delete_button.${index + 1}` : undefined;
            const isConfirmingDelete = deletingId === entry.id;
            const isCopied = copiedId === entry.id;

            return (
              <div
                key={entry.id}
                data-ocid={cardOcid}
                className="rounded-lg overflow-hidden transition-all duration-150"
                style={{
                  backgroundColor: "var(--editor-bg)",
                  border: `1px solid ${isConfirmingDelete ? "rgba(239,68,68,0.35)" : "var(--border-color)"}`,
                  borderLeft: `3px solid ${catStyle.border}`,
                }}
              >
                <div className="p-3">
                  {/* Top row: name + category */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-sm font-semibold truncate flex-1 leading-snug"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {entry.name}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 tracking-wide"
                      style={{
                        color: catStyle.text,
                        backgroundColor: catStyle.bg,
                        border: `1px solid ${catStyle.border}`,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {entry.category}
                    </span>
                  </div>

                  {/* Formula preview */}
                  <div
                    className="rounded px-2.5 py-1.5 mb-2 text-[11px] font-mono leading-relaxed"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.2)",
                      color: "#67e8f9",
                      border: "1px solid rgba(103,232,249,0.08)",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      wordBreak: "break-all",
                      fontFamily: "var(--font-mono)",
                    }}
                    title={entry.formula}
                  >
                    {entry.formula.length > 80
                      ? `${entry.formula.slice(0, 80)}…`
                      : entry.formula}
                  </div>

                  {/* Timestamp */}
                  <div
                    className="flex items-center gap-1 mb-2.5 text-[11px]"
                    style={{ color: "var(--muted-text)" }}
                  >
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>{formatDate(entry.savedAt)}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      data-ocid={copyOcid}
                      onClick={() => handleCopy(entry)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-all duration-150"
                      style={{
                        backgroundColor: isCopied
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isCopied ? "rgba(16,185,129,0.35)" : "var(--border-color)"}`,
                        color: isCopied ? "#34d399" : "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isCopied) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(255,255,255,0.07)";
                          e.currentTarget.style.borderColor =
                            "var(--border-color-bright)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCopied) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor =
                            "var(--border-color)";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      {isCopied ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {isCopied ? "Copied!" : "Copy"}
                    </button>

                    <button
                      type="button"
                      data-ocid={loadOcid}
                      onClick={() => onLoad(entry.formula)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-all duration-150 flex-1 justify-center"
                      style={{
                        backgroundColor: "rgba(59,130,246,0.08)",
                        border: "1px solid rgba(59,130,246,0.2)",
                        color: "#93c5fd",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(59,130,246,0.16)";
                        e.currentTarget.style.borderColor =
                          "rgba(59,130,246,0.4)";
                        e.currentTarget.style.boxShadow =
                          "0 0 8px rgba(59,130,246,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(59,130,246,0.08)";
                        e.currentTarget.style.borderColor =
                          "rgba(59,130,246,0.2)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <Download className="w-3 h-3" />
                      Load
                    </button>

                    <button
                      type="button"
                      data-ocid={deleteOcid}
                      onClick={() => handleDelete(entry.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-all duration-150"
                      style={{
                        backgroundColor: isConfirmingDelete
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isConfirmingDelete ? "rgba(239,68,68,0.4)" : "var(--border-color)"}`,
                        color: isConfirmingDelete
                          ? "#f87171"
                          : "var(--muted-text)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (!isConfirmingDelete) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(239,68,68,0.08)";
                          e.currentTarget.style.borderColor =
                            "rgba(239,68,68,0.25)";
                          e.currentTarget.style.color = "#f87171";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isConfirmingDelete) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor =
                            "var(--border-color)";
                          e.currentTarget.style.color = "var(--muted-text)";
                        }
                      }}
                      title={
                        isConfirmingDelete
                          ? "Click again to confirm deletion"
                          : "Delete this alpha"
                      }
                    >
                      <Trash2 className="w-3 h-3" />
                      {isConfirmingDelete ? "Confirm?" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
