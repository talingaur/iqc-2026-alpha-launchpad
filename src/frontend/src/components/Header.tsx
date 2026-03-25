import { Zap } from "lucide-react";

interface HeaderProps {
  charCount: number;
}

export default function Header({ charCount }: HeaderProps) {
  return (
    <header
      data-ocid="header.section"
      className="header-glow-blue flex items-center justify-between px-6 py-3.5 flex-shrink-0"
      style={{
        backgroundColor: "var(--panel-bg)",
        borderBottom: "1px solid var(--border-color)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle ambient radial glow behind title */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-60px",
          left: "-20px",
          width: "320px",
          height: "140px",
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Left: branding */}
      <div className="flex items-center gap-3 relative z-10">
        {/* Icon accent */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(6,182,212,0.15) 100%)",
            border: "1px solid rgba(59,130,246,0.3)",
            boxShadow: "0 0 12px rgba(59,130,246,0.2)",
          }}
        >
          <Zap
            className="w-4 h-4"
            style={{ color: "#60a5fa" }}
            strokeWidth={2.5}
          />
        </div>

        <div className="flex flex-col gap-0">
          <h1
            className="text-base font-bold leading-snug tracking-tight"
            style={{
              background:
                "linear-gradient(105deg, #93c5fd 0%, #38bdf8 50%, #67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
            }}
          >
            AlphaForge
          </h1>
          <p
            className="text-xs"
            style={{ color: "var(--muted-text)", letterSpacing: "0.02em" }}
          >
            WorldQuant Brain Formula Studio
          </p>
        </div>
      </div>

      {/* Right: badges */}
      <div className="flex items-center gap-2.5 relative z-10">
        {/* Char count */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-medium"
          style={{
            backgroundColor:
              charCount > 0
                ? "rgba(59,130,246,0.08)"
                : "rgba(255,255,255,0.04)",
            border: `1px solid ${charCount > 0 ? "rgba(59,130,246,0.2)" : "var(--border-color)"}`,
            color: charCount > 0 ? "#93c5fd" : "var(--muted-text)",
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: charCount > 0 ? "#3b82f6" : "#2a2d40",
              boxShadow:
                charCount > 0 ? "0 0 5px rgba(59,130,246,0.9)" : "none",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          />
          <span>{charCount} chars</span>
        </div>

        {/* Competition badge */}
        <div
          className="px-2.5 py-1.5 rounded text-xs font-semibold tracking-wide"
          style={{
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.08) 100%)",
            border: "1px solid rgba(16,185,129,0.25)",
            color: "#34d399",
            letterSpacing: "0.05em",
          }}
        >
          AlphaForge
        </div>
      </div>
    </header>
  );
}
