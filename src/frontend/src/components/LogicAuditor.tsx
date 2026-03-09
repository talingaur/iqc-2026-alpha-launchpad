interface LogicAuditorProps {
  formula: string;
}

export default function LogicAuditor({ formula }: LogicAuditorProps) {
  if (!formula.trim()) {
    return (
      <div
        data-ocid="auditor.panel"
        className="auditor-banner auditor-banner-idle flex items-center gap-3 px-4 py-2.5 text-xs"
      >
        <span
          style={{
            color: "var(--border-color-bright)",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          ○
        </span>
        <span style={{ color: "var(--muted-text)" }}>
          Type a formula above to see real-time neutralization analysis
        </span>
      </div>
    );
  }

  const hasRank = /(?<!ts_)rank\s*\(/.test(formula) || /\brank\b/.test(formula);
  const hasGroupNeutralize = /group_neutralize\s*\(/.test(formula);

  if (hasRank && hasGroupNeutralize) {
    return (
      <div
        data-ocid="auditor.success_state"
        className="auditor-banner auditor-banner-success animate-slide-in flex items-start gap-3 px-4 py-3 text-sm"
      >
        <span
          style={{
            fontSize: "15px",
            lineHeight: 1,
            marginTop: "1px",
            flexShrink: 0,
          }}
        >
          ✅
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-semibold" style={{ color: "#34d399" }}>
            Neutralization detected. Formula looks Tier 1 ready.
          </span>
          <span className="text-xs" style={{ color: "rgba(52,211,153,0.65)" }}>
            Both{" "}
            <code
              className="font-mono text-[11px] px-1 py-0.5 rounded"
              style={{
                backgroundColor: "rgba(52,211,153,0.1)",
                color: "#6ee7b7",
              }}
            >
              rank()
            </code>{" "}
            and{" "}
            <code
              className="font-mono text-[11px] px-1 py-0.5 rounded"
              style={{
                backgroundColor: "rgba(52,211,153,0.1)",
                color: "#6ee7b7",
              }}
            >
              group_neutralize()
            </code>{" "}
            detected — cross-sectional correlation risk mitigated.
          </span>
        </div>
      </div>
    );
  }

  if (!hasRank && !hasGroupNeutralize) {
    return (
      <div
        data-ocid="auditor.error_state"
        className="auditor-banner auditor-banner-error animate-slide-in flex items-start gap-3 px-4 py-3 text-sm"
      >
        <span
          style={{
            fontSize: "15px",
            lineHeight: 1,
            marginTop: "1px",
            flexShrink: 0,
          }}
        >
          ⚠️
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-semibold" style={{ color: "#f87171" }}>
            Risk: High Correlation. Tier 1 requires Neutralization.
          </span>
          <span className="text-xs" style={{ color: "rgba(248,113,113,0.65)" }}>
            Add{" "}
            <code
              className="font-mono text-[11px] px-1 py-0.5 rounded"
              style={{
                backgroundColor: "rgba(248,113,113,0.1)",
                color: "#fca5a5",
              }}
            >
              rank()
            </code>{" "}
            and{" "}
            <code
              className="font-mono text-[11px] px-1 py-0.5 rounded"
              style={{
                backgroundColor: "rgba(248,113,113,0.1)",
                color: "#fca5a5",
              }}
            >
              group_neutralize()
            </code>{" "}
            to reduce cross-sectional correlation and meet Tier 1 requirements.
          </span>
        </div>
      </div>
    );
  }

  // Partial: only one is present
  const missing = hasRank ? "group_neutralize()" : "rank()";
  const present = hasRank ? "rank()" : "group_neutralize()";

  return (
    <div
      data-ocid="auditor.panel"
      className="auditor-banner auditor-banner-warning animate-slide-in flex items-start gap-3 px-4 py-3 text-sm"
    >
      <span
        style={{
          fontSize: "15px",
          lineHeight: 1,
          marginTop: "1px",
          flexShrink: 0,
        }}
      >
        ⚡
      </span>
      <div className="flex flex-col gap-1">
        <span className="font-semibold" style={{ color: "#fcd34d" }}>
          Partial Neutralization. Consider adding both for Tier 1.
        </span>
        <span className="text-xs" style={{ color: "rgba(252,211,77,0.65)" }}>
          <code
            className="font-mono text-[11px] px-1 py-0.5 rounded"
            style={{
              backgroundColor: "rgba(252,211,77,0.1)",
              color: "#fde68a",
            }}
          >
            {present}
          </code>{" "}
          found — still missing{" "}
          <code
            className="font-mono text-[11px] px-1 py-0.5 rounded"
            style={{
              backgroundColor: "rgba(252,211,77,0.1)",
              color: "#fde68a",
            }}
          >
            {missing}
          </code>{" "}
          for full Tier 1 compliance.
        </span>
      </div>
    </div>
  );
}
