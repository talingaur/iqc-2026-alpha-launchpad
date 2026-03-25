import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface Suggestion {
  action: string;
  reason: string;
  operator?: string;
}

interface Analysis {
  sharpe: Suggestion[];
  fitness: Suggestion[];
  decay: Suggestion[];
  neutralization: Suggestion[];
}

function parseDecayWindow(formula: string): number | null {
  const m = formula.match(/decay_linear\s*\([^,]+,\s*(\d+)\s*\)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

function analyzeFormula(formula: string): Analysis {
  const f = formula.toLowerCase();

  const sharpe: Suggestion[] = [];

  if (!f.includes("rank(") && !f.includes("ts_rank(")) {
    sharpe.push({
      action: "Apply rank() to cross-sectionally normalize the signal",
      reason:
        "rank() compresses extreme values and makes the signal distribution uniform across the universe, which directly improves Sharpe by reducing noise.",
      operator: "rank",
    });
  }

  if (!f.includes("group_neutralize(") && !f.includes("indneutralize(")) {
    sharpe.push({
      action: "Add group_neutralize(signal, sector) to remove sector bias",
      reason:
        "Without neutralization, sector-wide movements inflate apparent Sharpe. group_neutralize isolates stock-specific alpha from sector beta.",
      operator: "group_neutralize",
    });
  }

  if (!f.includes("winsorize(") && !f.includes("pasteurize(")) {
    sharpe.push({
      action: "Add winsorize(signal, 0.05) to clip outliers before ranking",
      reason:
        "Outlier alpha values distort the signal and inflate realized volatility. Winsorizing at 5% tails stabilizes Sharpe by controlling drawdown.",
      operator: "winsorize",
    });
  }

  if (!f.includes("ts_corr(") && !f.includes("ts_zscore(")) {
    sharpe.push({
      action: "Incorporate ts_zscore(signal, 20) for time-series normalization",
      reason:
        "ts_zscore removes serial autocorrelation and adapts the signal to its own history, improving regime consistency and Sharpe stability.",
      operator: "ts_zscore",
    });
  }

  if (!f.includes("signed_power(") && !f.includes("log(")) {
    sharpe.push({
      action: "Use signed_power(signal, 0.5) to reduce skewness",
      reason:
        "Skewed signals produce lopsided return distributions. signed_power compresses the tail while preserving sign, giving a more symmetric payoff and better Sharpe.",
      operator: "signed_power",
    });
  }

  if (f.includes("volume") && !f.includes("adv(")) {
    sharpe.push({
      action: "Normalize volume: volume / adv(20) instead of raw volume",
      reason:
        "Raw volume varies widely across stocks and time. Dividing by adv(20) makes the signal comparable across the universe, reducing bias and improving Sharpe.",
      operator: "adv",
    });
  }

  const fitness: Suggestion[] = [];
  const decayWindow = parseDecayWindow(formula);

  if (!f.includes("decay_linear(")) {
    fitness.push({
      action:
        "Add decay_linear(signal, 10) to reduce turnover and improve fitness",
      reason:
        "High turnover is the #1 fitness killer. decay_linear with a 10-day window smooths daily signal changes, cutting unnecessary trades while preserving trend.",
      operator: "decay_linear",
    });
  } else if (decayWindow !== null && decayWindow < 5) {
    fitness.push({
      action: `Increase decay window (currently ${decayWindow}) — very short decay causes excessive turnover`,
      reason:
        "A decay window below 5 barely smooths the signal, resulting in high daily position churn that hurts fitness score and increases transaction costs.",
      operator: "decay_linear",
    });
  }

  if (
    !f.includes("pasteurize(") &&
    !f.includes("truncate(") &&
    !f.includes("winsorize(")
  ) {
    fitness.push({
      action:
        "Add pasteurize() or truncate(signal, 0.01) to prevent extreme position weights",
      reason:
        "Extreme weights cause concentration risk. pasteurize() removes illiquid stocks; truncate() caps position sizes — both directly improve fitness checks.",
      operator: "pasteurize",
    });
  }

  if (!f.includes("scale(") && !f.includes("normalize(")) {
    fitness.push({
      action:
        "Wrap with scale(signal) or normalize(signal) to standardize position sizes",
      reason:
        "Brain expects book-neutral signals. scale() ensures the long and short legs are balanced, which is checked during fitness evaluation.",
      operator: "scale",
    });
  }

  let depth = 0;
  let maxDepth = 0;
  for (const ch of formula) {
    if (ch === "(") {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (ch === ")") depth--;
  }
  if (maxDepth > 3 && !f.includes("rank(")) {
    fitness.push({
      action:
        "Apply rank() at the outermost level to compress complex sub-expressions",
      reason:
        "Deeply nested expressions without a final rank() can produce unbounded values that fail Brain's submission checks and hurt fitness.",
      operator: "rank",
    });
  }

  const decay: Suggestion[] = [];

  if (decayWindow === null) {
    decay.push({
      action: "No decay found — recommended: decay_linear(signal, 10)",
      reason:
        "A 10-day decay window balances signal freshness with turnover control. Without decay, even a good alpha will produce excessive daily churn.",
      operator: "decay_linear",
    });
  } else if (decayWindow < 5) {
    decay.push({
      action: `Decay window ${decayWindow} is very short — consider 7–10 to reduce excessive turnover`,
      reason:
        "Windows below 5 provide minimal smoothing. Increasing to 7–10 will significantly reduce turnover and improve both fitness and Sharpe consistency.",
      operator: "decay_linear",
    });
  } else if (decayWindow > 22) {
    decay.push({
      action: `Decay window ${decayWindow} is long — signal may become stale; consider 15–20`,
      reason:
        "Long decay windows over-smooth the signal, reducing its responsiveness to new information. This typically lowers alpha and can hurt Sharpe.",
      operator: "decay_linear",
    });
  } else if (decayWindow >= 5 && decayWindow <= 10) {
    decay.push({
      action: `Good short-term decay window (${decayWindow}). If Sharpe is volatile, try increasing to 15 for smoother returns`,
      reason:
        "Short windows (5–10) work well for mean-reversion alphas. For trend-following formulas, a slightly longer window (13–18) can reduce noise-driven reversals.",
      operator: "decay_linear",
    });
  } else {
    decay.push({
      action: `Good decay range (${decayWindow}). If turnover is too high, try reducing to 7–10`,
      reason:
        "Mid-range windows (11–22) are typical for momentum alphas. If Brain reports high turnover, stepping down by 3–5 days usually helps.",
      operator: "decay_linear",
    });
  }

  const neutralization: Suggestion[] = [];
  const hasSector = f.includes("group_neutralize") && f.includes("sector");
  const hasIndustry = f.includes("group_neutralize") && f.includes("industry");
  const hasSubIndustry =
    f.includes("group_neutralize") && f.includes("subindustry");
  const hasIndNeutralize = f.includes("indneutralize(");
  const hasAnyNeutralization =
    hasSector ||
    hasIndustry ||
    hasSubIndustry ||
    hasIndNeutralize ||
    f.includes("market");

  if (!hasAnyNeutralization) {
    neutralization.push({
      action: "Add group_neutralize(signal, sector) as baseline neutralization",
      reason:
        "Without neutralization, broad market and sector moves dominate your alpha. group_neutralize(signal, sector) is the minimum baseline for competitive Brain submissions.",
      operator: "group_neutralize",
    });
  } else if (
    hasSector &&
    !hasIndustry &&
    !hasSubIndustry &&
    !hasIndNeutralize
  ) {
    neutralization.push({
      action:
        "Consider group_neutralize(signal, industry) instead of sector for tighter peer-group control",
      reason:
        "Industry-level neutralization removes more correlated noise than sector, reducing residual correlation between stocks and typically improving Sharpe.",
      operator: "group_neutralize",
    });
  } else if (hasIndustry && !hasSubIndustry) {
    neutralization.push({
      action:
        "Industry neutralization is strong. Try subindustry for maximum isolation",
      reason:
        "subindustry is the finest grouping available. If your alpha still shows peer-group correlation in backtests, subindustry neutralization can squeeze out additional Sharpe.",
      operator: "group_neutralize",
    });
  }

  if (
    hasSector &&
    f.includes("rank(") &&
    !hasSubIndustry &&
    !hasIndNeutralize
  ) {
    neutralization.push({
      action:
        "Consider adding indneutralize(signal, subindustry) on top of sector neutralization",
      reason:
        "Combining sector group_neutralize with indneutralize at the subindustry level gives a two-pass neutralization that maximizes residual alpha and improves Sharpe.",
      operator: "indneutralize",
    });
  }

  if (!f.includes("rank(") && hasAnyNeutralization) {
    neutralization.push({
      action:
        "Apply rank() at the outermost level to ensure market-neutral signal",
      reason:
        "rank() after neutralization ensures the final signal is strictly market-neutral (long book = short book), which is required for clean Brain submissions.",
      operator: "rank",
    });
  }

  return { sharpe, fitness, decay, neutralization };
}

interface UserGoals {
  targetSharpe: number | null; // e.g. 1.25
  targetFitness: number | null; // e.g. 1.0
  maxTurnover: number | null; // e.g. 70 (percent)
  subUniverseSharpe: boolean;
  improveNeutralization: boolean;
  raw: string;
}

function parseUserGoals(text: string): UserGoals {
  const g: UserGoals = {
    targetSharpe: null,
    targetFitness: null,
    maxTurnover: null,
    subUniverseSharpe: false,
    improveNeutralization: false,
    raw: text,
  };

  const lower = text.toLowerCase();

  // Sharpe > X
  const sharpeMatch = lower.match(/sharpe[^\d]*(\d+(\.\d+)?)/);
  if (sharpeMatch) g.targetSharpe = Number.parseFloat(sharpeMatch[1]);

  // Fitness > X
  const fitnessMatch = lower.match(/fitness[^\d]*(\d+(\.\d+)?)/);
  if (fitnessMatch) g.targetFitness = Number.parseFloat(fitnessMatch[1]);

  // Turnover < X
  const turnoverMatch = lower.match(/turnover[^\d]*(\d+(\.\d+)?)/);
  if (turnoverMatch) g.maxTurnover = Number.parseFloat(turnoverMatch[1]);

  // Sub-universe Sharpe
  if (
    lower.includes("sub universe") ||
    lower.includes("sub-universe") ||
    lower.includes("subuniverse") ||
    lower.includes("sub sharpe")
  ) {
    g.subUniverseSharpe = true;
  }

  // Neutralization
  if (
    lower.includes("neutral") ||
    lower.includes("industry") ||
    lower.includes("sector")
  ) {
    g.improveNeutralization = true;
  }

  return g;
}

function buildImprovedAlpha(
  formula: string,
  analysis: Analysis,
  goals: UserGoals,
): { improved: string; changes: string[] } {
  const f = formula.toLowerCase();
  let result = formula.trim();
  const changes: string[] = [];

  const needsRank = !f.includes("rank(") && !f.includes("ts_rank(");
  const needsGroupNeutralize =
    !f.includes("group_neutralize(") && !f.includes("indneutralize(");
  const needsDecay = !f.includes("decay_linear(");
  const decayWindow = parseDecayWindow(formula);
  const needsWinsorize =
    !f.includes("winsorize(") && !f.includes("pasteurize(");
  const needsScale = !f.includes("scale(") && !f.includes("normalize(");
  const needsTsZscore = !f.includes("ts_zscore(") && !f.includes("ts_corr(");

  const allSuggestions = [
    ...analysis.sharpe,
    ...analysis.fitness,
    ...analysis.decay,
    ...analysis.neutralization,
  ];
  const suggestedOps = new Set(
    allSuggestions.map((s) => s.operator).filter(Boolean),
  );

  // ── Goal-driven additions ──

  // High Sharpe target (> 1.25): add ts_zscore + winsorize + rank + group_neutralize
  const highSharpTarget =
    goals.targetSharpe !== null && goals.targetSharpe >= 1.25;

  // Low turnover / high fitness: use longer decay + scale + pasteurize
  const lowTurnoverGoal = goals.maxTurnover !== null && goals.maxTurnover <= 70;
  const highFitnessGoal =
    goals.targetFitness !== null && goals.targetFitness >= 1.0;

  // Sub-universe Sharpe: add indneutralize subindustry
  if (goals.subUniverseSharpe && !f.includes("indneutralize(")) {
    result = `indneutralize(${result}, subindustry)`;
    changes.push("Added indneutralize(subindustry) for sub-universe Sharpe");
  }

  // Winsorize: needed for Sharpe stability and fitness (cap extreme values)
  if (
    needsWinsorize &&
    (suggestedOps.has("winsorize") || highSharpTarget || highFitnessGoal)
  ) {
    result = `winsorize(${result}, 0.05)`;
    changes.push("Added winsorize(0.05) — clips extreme values");
  }

  // Decay: determine optimal window based on goals
  if (
    needsDecay &&
    (suggestedOps.has("decay_linear") || lowTurnoverGoal || highFitnessGoal)
  ) {
    // Longer decay = lower turnover
    const window = lowTurnoverGoal ? 15 : highFitnessGoal ? 12 : 10;
    result = `decay_linear(${result}, ${window})`;
    changes.push(
      `Added decay_linear(${window})${lowTurnoverGoal ? " — tuned for lower turnover" : ""}`,
    );
  } else if (
    !needsDecay &&
    decayWindow !== null &&
    lowTurnoverGoal &&
    decayWindow < 10
  ) {
    // Replace existing short decay with longer one
    const newWindow = 15;
    result = result.replace(
      /decay_linear\s*\((.+),\s*\d+\s*\)/,
      `decay_linear($1, ${newWindow})`,
    );
    changes.push(`Increased decay to ${newWindow} to reduce turnover`);
  }

  // ts_zscore: for Sharpe consistency
  if (needsTsZscore && highSharpTarget) {
    result = `ts_zscore(${result}, 20)`;
    changes.push(
      "Added ts_zscore(20) — time-series normalization for Sharpe stability",
    );
  }

  // Group neutralize: add sector or upgrade to industry level
  if (
    needsGroupNeutralize &&
    (suggestedOps.has("group_neutralize") ||
      goals.improveNeutralization ||
      highSharpTarget)
  ) {
    const level = goals.subUniverseSharpe
      ? "subindustry"
      : goals.improveNeutralization
        ? "industry"
        : "sector";
    result = `group_neutralize(${result}, ${level})`;
    changes.push(`Added group_neutralize(${level})`);
  }

  // rank: outermost normalization
  if (
    needsRank &&
    (suggestedOps.has("rank") || highSharpTarget || highFitnessGoal)
  ) {
    result = `rank(${result})`;
    changes.push("Added rank() — cross-sectional normalization");
  }

  // Pasteurize for fitness: removes illiquid stocks
  if (!f.includes("pasteurize(") && highFitnessGoal) {
    result = `pasteurize(${result})`;
    changes.push(
      "Added pasteurize() — removes illiquid stocks for better fitness",
    );
  }

  // Scale for book-neutral signal
  if (
    needsScale &&
    (suggestedOps.has("scale") || highFitnessGoal || lowTurnoverGoal)
  ) {
    result = `scale(${result})`;
    changes.push("Added scale() — ensures book-neutral positions");
  }

  return { improved: result, changes };
}

function OpBadge({ name }: { name: string }) {
  return (
    <code
      className="font-mono text-[11px] px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: "rgba(255,255,255,0.06)",
        color: "var(--syn-cyan)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {name}()
    </code>
  );
}

function SuggestionItem({ s }: { s: Suggestion }) {
  return (
    <div
      className="flex flex-col gap-1 py-2.5 px-3 rounded-md"
      style={{
        backgroundColor: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-start gap-2">
        {s.operator && (
          <span className="mt-0.5 flex-shrink-0">
            <OpBadge name={s.operator} />
          </span>
        )}
        <span
          className="text-[12px] font-medium leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {s.action}
        </span>
      </div>
      <p
        className="text-[11px] leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {s.reason}
      </p>
    </div>
  );
}

function AdvisorSection({
  title,
  accent,
  suggestions,
}: {
  title: string;
  accent: string;
  suggestions: Suggestion[];
}) {
  const looksGood = suggestions.length === 0;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--editor-bg)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: looksGood ? "none" : "1px solid var(--border-color)",
          borderLeft: `3px solid ${accent}`,
          backgroundColor: "rgba(255,255,255,0.018)",
        }}
      >
        <span
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: accent }}
        >
          {title}
        </span>
        {looksGood && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${accent}18`,
              color: accent,
              border: `1px solid ${accent}30`,
            }}
          >
            ✓ Looks good
          </span>
        )}
      </div>

      {!looksGood && (
        <div className="flex flex-col gap-2 p-3">
          {suggestions.map((s, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static analysis list
            <SuggestionItem key={i} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const examples = [
    "fitness > 1, turnover < 70%",
    "sharpe > 1.25",
    "sub universe sharpe",
    "improve neutralization",
  ];

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{
        border: "1px solid rgba(99,102,241,0.35)",
        backgroundColor: "var(--editor-bg)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          borderBottom: "1px solid rgba(99,102,241,0.2)",
          borderLeft: "3px solid #6366f1",
          backgroundColor: "rgba(99,102,241,0.04)",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: "#818cf8" }}
          >
            Improvement Goals
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Describe what Brain reported — system will fix it
          </span>
        </div>
      </div>

      {/* Textarea */}
      <div className="p-3 flex flex-col gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`e.g. ${examples[0]}\n\nYou can write:\n• fitness 0.7 → make it > 1\n• turnover too high, reduce it\n• sharpe needs to be > 1.25\n• sub universe sharpe is low`}
          rows={7}
          style={{
            backgroundColor: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "6px",
            color: "#e2e8f0",
            fontSize: "12px",
            lineHeight: "1.6",
            padding: "10px 12px",
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            width: "100%",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        />

        {/* Quick-fill chips */}
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange(value ? `${value}\n${ex}` : ex)}
              className="text-[10px] px-2 py-0.5 rounded-full transition-colors duration-100"
              style={{
                backgroundColor: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "#818cf8",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(99,102,241,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(99,102,241,0.1)";
              }}
            >
              + {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImprovedAlphaPanel({
  improved,
  changes,
}: {
  improved: string;
  changes: string[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(improved).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{
        border: "1px solid rgba(245,158,11,0.3)",
        backgroundColor: "var(--editor-bg)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: "1px solid rgba(245,158,11,0.2)",
          borderLeft: "3px solid #f59e0b",
          backgroundColor: "rgba(245,158,11,0.04)",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: "#f59e0b" }}
          >
            Improved Alpha
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--text-secondary)" }}
          >
            Optimized for Brain submission targets
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          data-ocid="improved_alpha.button"
          className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-150"
          style={{
            backgroundColor: copied
              ? "rgba(52,211,153,0.15)"
              : "rgba(255,255,255,0.06)",
            border: copied
              ? "1px solid rgba(52,211,153,0.4)"
              : "1px solid rgba(255,255,255,0.1)",
            color: copied ? "#34d399" : "var(--text-secondary)",
            cursor: "pointer",
          }}
          title="Copy improved formula"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="text-[10px] font-medium">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>
      </div>

      {/* Formula code block */}
      <div className="p-3">
        <pre
          className="font-mono text-[12px] leading-relaxed rounded-md p-3"
          style={{
            backgroundColor: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "#7dd3fc",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            overflowWrap: "break-word",
            margin: 0,
          }}
        >
          {improved}
        </pre>
      </div>

      {/* Changes applied */}
      {changes.length > 0 && (
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          <span
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: "rgba(245,158,11,0.7)" }}
          >
            Changes Applied
          </span>
          <div className="flex flex-col gap-1">
            {changes.map((change, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              <div key={i} className="flex items-center gap-1.5">
                <span style={{ color: "#34d399", fontSize: "10px" }}>+</span>
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {change}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.length === 0 && (
        <div className="px-3 pb-3">
          <span
            className="text-[11px]"
            style={{ color: "var(--text-secondary)" }}
          >
            ✓ No structural changes needed — formula looks complete.
          </span>
        </div>
      )}
    </div>
  );
}

export default function AlphaAdvisor({ formula }: { formula: string }) {
  const [goalsText, setGoalsText] = useState("");

  if (!formula.trim()) return null;

  const analysis = analyzeFormula(formula);
  const { sharpe, fitness, decay, neutralization } = analysis;
  const goals = parseUserGoals(goalsText);
  const { improved, changes } = buildImprovedAlpha(formula, analysis, goals);

  return (
    <div className="flex flex-col gap-3" data-ocid="alpha_advisor.panel">
      <div className="flex items-center gap-2">
        <div
          className="h-px flex-1"
          style={{ backgroundColor: "var(--border-color)" }}
        />
        <span className="section-label" style={{ flexShrink: 0 }}>
          Alpha Advisor
        </span>
        <div
          className="h-px flex-1"
          style={{ backgroundColor: "var(--border-color)" }}
        />
      </div>

      {/* Three-column layout */}
      <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
        {/* Left: Suggestions (50%) */}
        <div
          className="flex flex-col gap-3"
          style={{ flex: "0 0 50%", minWidth: 0 }}
        >
          <AdvisorSection
            title="Sharpe Ratio Suggestions"
            accent="#60a5fa"
            suggestions={sharpe}
          />
          <AdvisorSection
            title="Fitness Suggestions"
            accent="#34d399"
            suggestions={fitness}
          />
          <AdvisorSection
            title="Decay Recommendations"
            accent="#f97316"
            suggestions={decay}
          />
          <AdvisorSection
            title="Neutralization Recommendations"
            accent="#a855f7"
            suggestions={neutralization}
          />
        </div>

        {/* Middle: Improvement Goals (25%) */}
        <div style={{ flex: "0 0 25%", minWidth: 0 }}>
          <GoalInput value={goalsText} onChange={setGoalsText} />
        </div>

        {/* Right: Improved Alpha (25%) */}
        <div style={{ flex: "0 0 25%", minWidth: 0 }}>
          <ImprovedAlphaPanel improved={improved} changes={changes} />
        </div>
      </div>
    </div>
  );
}
