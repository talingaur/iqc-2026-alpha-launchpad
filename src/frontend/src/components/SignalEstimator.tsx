interface SignalEstimatorProps {
  formula: string;
}

interface EstimateResult {
  sharpeMin: number;
  sharpeMax: number;
  pointsMin: number;
  pointsMax: number;
  confidence: "low" | "medium" | "high";
  signals: { label: string; positive: boolean }[];
  suggestions: { action: string; reason: string }[];
}

function estimateSignal(formula: string): EstimateResult | null {
  if (!formula.trim()) return null;

  const f = formula.toLowerCase();

  // --- Feature detection ---
  const hasRank = /\brank\s*\(/.test(f);
  const hasTsRank = /\bts_rank\s*\(/.test(f);
  const hasGroupNeutralize = /\bgroup_neutralize\s*\(/.test(f);
  const hasDecay = /\bdecay_linear\s*\(/.test(f);
  const hasReturns = /\breturns\b/.test(f);
  const hasVolume = /\bvolume\b/.test(f);
  const hasAdv = /\badv\s*\(/.test(f);
  const hasClose = /\bclose\b/.test(f);
  const hasWinsorize = /\bwinsorize\s*\(/.test(f);
  const hasPasteurize = /\bpasteurize\s*\(/.test(f);
  const hasTsCorr = /\bts_corr\s*\(/.test(f);
  const hasTsZscore = /\bts_zscore\s*\(/.test(f);
  const hasNormalize = /\bnormalize\s*\(/.test(f);
  const hasSignedPower = /\bsigned_power\s*\(/.test(f);
  const hasLog = /\blog\s*\(/.test(f);
  const hasSector = /\bsector\b/.test(f);
  const hasIndustry = /\bindustry\b/.test(f);
  const hasIndneutralize = /\bindneutralize\s*\(/.test(f);
  const hasMultiplier = /\*/.test(f);
  const hasDivide = /\bdivide\s*\(|\//.test(f);

  // Extract decay window (e.g. decay_linear(x, 10) -> 10)
  const decayMatch = /decay_linear\s*\([^,]+,\s*(\d+)/.exec(f);
  const decayWindow = decayMatch ? Number.parseInt(decayMatch[1]) : 0;
  const decayOk = decayWindow >= 5 && decayWindow <= 22;

  // Count operators to gauge complexity
  const operatorCount = [
    hasRank,
    hasTsRank,
    hasGroupNeutralize,
    hasDecay,
    hasReturns,
    hasVolume,
    hasAdv,
    hasClose,
    hasWinsorize,
    hasPasteurize,
    hasTsCorr,
    hasTsZscore,
    hasNormalize,
    hasSignedPower,
    hasLog,
    hasSector,
    hasIndustry,
    hasIndneutralize,
    hasMultiplier,
    hasDivide,
  ].filter(Boolean).length;

  // --- Scoring (each unit ~= 0.1 Sharpe) ---
  let score = 0;

  if (hasRank) score += 1.5;
  if (hasTsRank) score += 1.2;
  if (hasGroupNeutralize) score += 2.0;
  if (hasIndneutralize) score += 1.5;
  if (hasDecay && decayOk) score += 1.5;
  if (hasDecay && !decayOk) score += 0.5;
  if (hasReturns) score += 0.8;
  if (hasAdv) score += 1.0;
  if (hasVolume && hasAdv) score += 0.8; // volume normalized by adv is better
  if (hasWinsorize || hasPasteurize) score += 1.0;
  if (hasTsCorr) score += 1.2;
  if (hasTsZscore) score += 0.8;
  if (hasNormalize) score += 0.5;
  if (hasSignedPower) score += 0.7;
  if (hasLog) score += 0.5;
  if ((hasSector || hasIndustry) && hasGroupNeutralize) score += 1.0;
  if (hasMultiplier && (hasRank || hasGroupNeutralize)) score += 0.8;
  if (hasDivide && hasAdv) score += 0.5;
  if (operatorCount >= 6) score += 1.0; // complexity bonus

  // Penalties
  if (!hasRank && !hasTsRank && !hasGroupNeutralize) score -= 1.5;
  if (!hasDecay) score -= 0.5;

  // Convert score to Sharpe range (rough mapping)
  // score ~14 max -> Sharpe ~1.8+, score ~0 -> Sharpe ~0.2
  const sharpeBase = Math.max(0.1, score * 0.115);
  const sharpeMin = Math.round((sharpeBase - 0.15) * 10) / 10;
  const sharpeMax = Math.round((sharpeBase + 0.25) * 10) / 10;

  // Points: Brain IQC - no fixed upper limit; score correlates with Sharpe + originality
  // Roughly: Sharpe 1.0 ~ 50 pts, Sharpe 1.8 ~ 80 pts, higher Sharpe can go well above 100
  const pointsBase = Math.round(sharpeBase * 50 + 5);
  const pointsMin = Math.max(0, Math.round(pointsBase - 8));
  const pointsMax = Math.round(pointsBase + 15);

  // Confidence
  let confidence: "low" | "medium" | "high" = "low";
  if (operatorCount >= 4 && (hasRank || hasTsRank)) confidence = "medium";
  if (operatorCount >= 6 && hasGroupNeutralize && hasDecay) confidence = "high";

  // Human-readable signals
  const signals: { label: string; positive: boolean }[] = [];
  if (hasGroupNeutralize)
    signals.push({ label: "Sector neutralized", positive: true });
  else signals.push({ label: "No group neutralization", positive: false });

  if (hasRank || hasTsRank)
    signals.push({ label: "Cross-sectional ranking", positive: true });
  else signals.push({ label: "Missing rank operator", positive: false });

  if (hasDecay && decayOk)
    signals.push({
      label: `Decay window ${decayWindow}d (good range)`,
      positive: true,
    });
  else if (hasDecay)
    signals.push({
      label: `Decay window ${decayWindow}d (consider 5–22)`,
      positive: false,
    });
  else signals.push({ label: "No decay smoothing", positive: false });

  if (hasAdv)
    signals.push({ label: "Volume normalized by ADV", positive: true });
  if (hasWinsorize || hasPasteurize)
    signals.push({ label: "Outlier clipping applied", positive: true });
  if (hasTsCorr)
    signals.push({ label: "Time-series correlation feature", positive: true });
  if (hasSignedPower || hasLog)
    signals.push({ label: "Non-linear transform", positive: true });
  if (operatorCount >= 6)
    signals.push({ label: "High operator complexity", positive: true });
  else if (operatorCount < 3)
    signals.push({ label: "Low formula complexity", positive: false });

  // Actionable suggestions to improve Sharpe
  const suggestions: { action: string; reason: string }[] = [];

  if (!hasGroupNeutralize && !hasIndneutralize) {
    suggestions.push({
      action: "Wrap with group_neutralize(…, sector)",
      reason:
        "Removes sector-wide bias so the alpha captures stock-specific signal rather than broad sector moves, directly lifting risk-adjusted returns.",
    });
  }

  if (!hasRank && !hasTsRank) {
    suggestions.push({
      action: "Apply rank(…) or ts_rank(…) to your signal",
      reason:
        "Cross-sectional ranking compresses outliers and makes the signal distribution uniform, reducing variance and improving Sharpe.",
    });
  }

  if (!hasDecay || !decayOk) {
    suggestions.push({
      action: `Use decay_linear(…, ${!hasDecay ? 10 : decayWindow < 5 ? 7 : 15}) with a 5–22 day window`,
      reason:
        "Smoothing with an appropriate decay reduces noise from day-to-day microstructure, lowering the standard deviation of returns without proportionally cutting the mean.",
    });
  }

  if (!hasWinsorize && !hasPasteurize) {
    suggestions.push({
      action: "Add winsorize(…, 0.05) or pasteurize(…) before ranking",
      reason:
        "Clipping extreme values prevents a handful of outlier stocks from dominating PnL volatility, which directly improves the Sharpe denominator.",
    });
  }

  if (!hasAdv && hasVolume) {
    suggestions.push({
      action: "Normalize volume by adv(20) instead of using raw volume",
      reason:
        "Dividing by 20-day average volume makes the signal scale-invariant across large-cap and small-cap stocks, reducing cross-sectional noise.",
    });
  }

  if (!hasTsCorr && !hasTsZscore) {
    suggestions.push({
      action: "Incorporate ts_corr(returns, volume, 10) or ts_zscore(…, 20)",
      reason:
        "Time-series correlation and z-score features capture regime-aware momentum or mean-reversion signals that tend to have higher IC persistence over time.",
    });
  }

  if (!hasSignedPower && !hasLog) {
    suggestions.push({
      action: "Apply signed_power(…, 0.5) or log(abs(…)+1) to skewed inputs",
      reason:
        "Non-linear transforms reduce skewness in the raw signal, leading to more symmetric return distributions and a better Sharpe ratio.",
    });
  }

  if (operatorCount < 4) {
    suggestions.push({
      action: "Combine at least 2 independent sub-signals with a multiplier",
      reason:
        "Compositing uncorrelated features (e.g. momentum × liquidity) can improve expected IC while keeping volatility low, boosting Sharpe.",
    });
  }

  return {
    sharpeMin: Math.max(0.1, sharpeMin),
    sharpeMax: Math.max(0.3, sharpeMax),
    pointsMin,
    pointsMax,
    confidence,
    signals,
    suggestions,
  };
}

const CONFIDENCE_LABELS = {
  low: {
    label: "Low confidence",
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
  },
  medium: {
    label: "Medium confidence",
    color: "#fcd34d",
    bg: "rgba(252,211,77,0.08)",
  },
  high: {
    label: "High confidence",
    color: "#34d399",
    bg: "rgba(52,211,153,0.08)",
  },
};

export default function SignalEstimator({ formula }: SignalEstimatorProps) {
  const result = estimateSignal(formula);

  return (
    <div data-ocid="estimator.panel" className="flex flex-col gap-2">
      {/* Label row */}
      <div className="flex items-center justify-between px-0.5">
        <span className="section-label">Signal Estimator</span>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "rgba(251,191,36,0.12)",
            color: "#fbbf24",
            border: "1px solid rgba(251,191,36,0.2)",
          }}
        >
          HEURISTIC · NOT A BACKTEST
        </span>
      </div>

      {!result ? (
        <div
          className="auditor-banner auditor-banner-idle flex items-center gap-3 px-4 py-2.5 text-xs"
          data-ocid="estimator.empty_state"
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
            Type a formula above to see signal estimate
          </span>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--editor-bg)",
          }}
          data-ocid="estimator.card"
        >
          {/* Metrics row */}
          <div
            className="grid grid-cols-2"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            {/* Sharpe */}
            <div className="flex flex-col items-center gap-1 py-4 px-3">
              <span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: "var(--muted-text)" }}
              >
                Est. Sharpe Ratio
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-2xl font-bold font-mono"
                  style={{ color: "#60a5fa" }}
                  data-ocid="estimator.sharpe_panel"
                >
                  {result.sharpeMin.toFixed(1)}–{result.sharpeMax.toFixed(1)}
                </span>
              </div>
              <span
                className="text-[10px]"
                style={{ color: "var(--muted-text)" }}
              >
                annualized
              </span>
            </div>

            {/* Points */}
            <div
              className="flex flex-col items-center gap-1 py-4 px-3"
              style={{ borderLeft: "1px solid var(--border-color)" }}
            >
              <span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: "var(--muted-text)" }}
              >
                Est. Brain Points
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-2xl font-bold font-mono"
                  style={{ color: "#a78bfa" }}
                  data-ocid="estimator.points_panel"
                >
                  {result.pointsMin}–{result.pointsMax}
                </span>
              </div>
              <span
                className="text-[10px]"
                style={{ color: "var(--muted-text)" }}
              >
                no fixed cap
              </span>
            </div>
          </div>

          {/* Signals list */}
          <div className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: "var(--muted-text)" }}
              >
                Formula Signals
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: CONFIDENCE_LABELS[result.confidence].bg,
                  color: CONFIDENCE_LABELS[result.confidence].color,
                  border: `1px solid ${CONFIDENCE_LABELS[result.confidence].color}30`,
                }}
                data-ocid="estimator.confidence_panel"
              >
                {CONFIDENCE_LABELS[result.confidence].label}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {result.signals.map((sig) => (
                <span
                  key={sig.label}
                  className="text-[11px] font-mono px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: sig.positive
                      ? "rgba(52,211,153,0.08)"
                      : "rgba(248,113,113,0.08)",
                    color: sig.positive ? "#6ee7b7" : "#fca5a5",
                    border: `1px solid ${sig.positive ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
                  }}
                >
                  {sig.positive ? "+" : "–"} {sig.label}
                </span>
              ))}
            </div>
          </div>

          {/* Sharpe Improvement Suggestions */}
          {result.suggestions.length > 0 && (
            <div
              className="flex flex-col gap-2 px-4 py-3"
              style={{ borderTop: "1px solid var(--border-color)" }}
              data-ocid="estimator.suggestions.panel"
            >
              <span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: "var(--muted-text)" }}
              >
                Suggestions to Increase Sharpe
              </span>
              <div className="flex flex-col gap-2">
                {result.suggestions.map((s, i) => (
                  <div
                    key={s.action}
                    data-ocid={`estimator.suggestions.item.${i + 1}`}
                    className="rounded-md px-3 py-2"
                    style={{
                      backgroundColor: "rgba(96,165,250,0.06)",
                      border: "1px solid rgba(96,165,250,0.15)",
                    }}
                  >
                    <div
                      className="text-[11px] font-mono font-semibold mb-0.5"
                      style={{ color: "#93c5fd" }}
                    >
                      ↑ {s.action}
                    </div>
                    <div
                      className="text-[10px] leading-relaxed"
                      style={{ color: "var(--muted-text)" }}
                    >
                      {s.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div
            className="px-4 py-2 text-[10px]"
            style={{
              borderTop: "1px solid var(--border-color)",
              color: "var(--muted-text)",
              backgroundColor: "rgba(0,0,0,0.15)",
            }}
          >
            Estimates are based on formula structure analysis only. Actual
            Sharpe and points require a full Brain backtest.
          </div>
        </div>
      )}
    </div>
  );
}
