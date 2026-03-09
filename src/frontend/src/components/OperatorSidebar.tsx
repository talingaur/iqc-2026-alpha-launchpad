import { Search } from "lucide-react";
import { useMemo, useState } from "react";

interface Operator {
  name: string;
  def: string;
}

const OPERATORS: Operator[] = [
  {
    name: "ts_rank",
    def: "Time-series rank of x over the past d days (0 to 1)",
  },
  { name: "rank", def: "Cross-sectional rank of x among all stocks (0 to 1)" },
  {
    name: "group_neutralize",
    def: "Neutralize x within groups (e.g., sector, industry)",
  },
  {
    name: "decay_linear",
    def: "Weighted decay of x over d days (linearly decreasing weights)",
  },
  { name: "ts_corr", def: "Time-series correlation of x and y over d days" },
  { name: "ts_mean", def: "Simple moving average of x over d days" },
  { name: "ts_std", def: "Time-series standard deviation of x over d days" },
  { name: "ts_sum", def: "Rolling sum of x over d days" },
  { name: "ts_max", def: "Rolling maximum of x over d days" },
  { name: "ts_min", def: "Rolling minimum of x over d days" },
  { name: "ts_zscore", def: "Time-series z-score of x over d days" },
  { name: "ts_delta", def: "Change in x over d days: x - ts_delay(x, d)" },
  { name: "ts_delay", def: "Value of x d days ago" },
  { name: "adv", def: "Average daily dollar volume over d days" },
  { name: "returns", def: "Daily returns of a stock" },
  { name: "close", def: "Closing price of the stock" },
  { name: "open", def: "Opening price of the stock" },
  { name: "high", def: "Daily high price" },
  { name: "low", def: "Daily low price" },
  { name: "volume", def: "Daily trading volume (shares)" },
  { name: "cap", def: "Market capitalization of the stock" },
  { name: "sector", def: "Sector classification group ID" },
  { name: "industry", def: "Industry classification group ID" },
  { name: "subindustry", def: "Sub-industry classification group ID" },
  { name: "market", def: "Market / exchange ID for the stock" },
  { name: "signed_power", def: "sign(x) * |x|^e — signed exponentiation" },
  { name: "log", def: "Natural logarithm of x" },
  { name: "abs", def: "Absolute value of x" },
  { name: "sign", def: "Sign of x: returns -1, 0, or 1" },
  { name: "divide", def: "Element-wise division: x / y" },
  { name: "subtract", def: "Element-wise subtraction: x - y" },
  { name: "add", def: "Element-wise addition: x + y" },
  { name: "multiply", def: "Element-wise multiplication: x * y" },
  { name: "power", def: "Raise x to the power of e" },
  { name: "sqrt", def: "Square root of x" },
  { name: "min", def: "Element-wise minimum of x and y" },
  { name: "max", def: "Element-wise maximum of x and y" },
  { name: "indneutralize", def: "Neutralize x within the same industry group" },
  { name: "winsorize", def: "Clamp extreme values of x at a given percentile" },
  { name: "pasteurize", def: "Set x to NaN for stocks that are not tradeable" },
  { name: "truncate", def: "Truncate x to the given max absolute value" },
  { name: "densify", def: "Replace NaN values in x with 0" },
  {
    name: "normalize",
    def: "Normalize x to have mean 0 and std 1 cross-sectionally",
  },
  {
    name: "scale",
    def: "Scale x so the sum of absolute values equals a target (default 1)",
  },
];

type OperatorColorKey =
  | "ts_rank"
  | "group_neutralize"
  | "decay_linear"
  | "rank"
  | "default";

function getColorKey(name: string): OperatorColorKey {
  if (name === "ts_rank") return "ts_rank";
  if (name === "group_neutralize") return "group_neutralize";
  if (name === "decay_linear") return "decay_linear";
  if (name === "rank") return "rank";
  return "default";
}

const COLOR_MAP: Record<
  OperatorColorKey,
  { text: string; bg: string; border: string }
> = {
  ts_rank: {
    text: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.22)",
  },
  group_neutralize: {
    text: "#c084fc",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.22)",
  },
  decay_linear: {
    text: "#fb923c",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.22)",
  },
  rank: {
    text: "#4ade80",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.22)",
  },
  default: {
    text: "#67e8f9",
    bg: "rgba(103,232,249,0.07)",
    border: "rgba(103,232,249,0.15)",
  },
};

interface OperatorSidebarProps {
  onInsert: (text: string) => void;
}

export default function OperatorSidebar({ onInsert }: OperatorSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return OPERATORS;
    return OPERATORS.filter(
      (op) =>
        op.name.toLowerCase().includes(q) || op.def.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <aside
      data-ocid="sidebar.panel"
      className="flex flex-col h-full"
      style={{
        backgroundColor: "var(--panel-bg)",
        borderLeft: "1px solid var(--border-color)",
      }}
    >
      {/* Sidebar header */}
      <div
        className="px-4 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        {/* Title row */}
        <div className="flex items-center gap-2 mb-3">
          <div
            aria-hidden="true"
            style={{
              width: "3px",
              height: "16px",
              borderRadius: "2px",
              background: "linear-gradient(180deg, #06b6d4 0%, #3b82f6 100%)",
              boxShadow: "0 0 8px rgba(6,182,212,0.5)",
              flexShrink: 0,
            }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "0.01em" }}
          >
            Operator Reference
          </h2>
          <span
            className="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.18)",
              color: "#818cf8",
            }}
          >
            {OPERATORS.length}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "var(--muted-text)", pointerEvents: "none" }}
          />
          <input
            data-ocid="sidebar.search_input"
            type="text"
            placeholder="Search operators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded text-xs pl-8 pr-3 py-2 outline-none transition-all duration-150"
            style={{
              backgroundColor: "var(--editor-bg)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui)",
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
          />
        </div>

        <p
          className="mt-2 text-[11px]"
          style={{ color: "var(--muted-text)", letterSpacing: "0.01em" }}
        >
          Click to insert at cursor
        </p>
      </div>

      {/* Operator list */}
      <div className="flex-1 overflow-y-auto py-1.5" style={{ minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-xs"
            style={{ color: "var(--muted-text)" }}
          >
            No operators match &ldquo;{search}&rdquo;
          </div>
        ) : (
          <ul className="flex flex-col px-1.5">
            {filtered.map((op, index) => {
              const ocid = index < 5 ? `sidebar.item.${index + 1}` : undefined;
              const colorKey = getColorKey(op.name);
              const colors = COLOR_MAP[colorKey];

              return (
                <li key={op.name}>
                  <button
                    data-ocid={ocid}
                    type="button"
                    onClick={() => onInsert(`${op.name}(`)}
                    className="op-row-hover w-full text-left px-3 py-2 rounded transition-colors duration-100"
                    style={{
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.035)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(6,182,212,0.06)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255,255,255,0.035)";
                    }}
                    title={`Insert ${op.name}(`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: colors.text,
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                          lineHeight: "1.4",
                          marginTop: "1px",
                        }}
                      >
                        {op.name}
                      </span>
                      <span
                        className="text-[11.5px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {op.def}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex-shrink-0 flex items-center gap-2"
        style={{
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <kbd
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-color-bright)",
            color: "var(--muted-text)",
            lineHeight: "1.6",
          }}
        >
          click
        </kbd>
        <span className="text-[11px]" style={{ color: "var(--muted-text)" }}>
          inserts operator at cursor
        </span>
      </div>
    </aside>
  );
}
