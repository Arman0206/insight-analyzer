'use client';

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// ── Score helpers ─────────────────────────────────────────────────────────────
function getVerdict(pros, cons) {
  const total = pros.length + cons.length;
  const score = total === 0 ? 5 : Math.round((pros.length / total) * 10);
  if (score >= 8) return { label: "Highly Recommended",    color: "#81c995", bg: "rgba(129,201,149,0.10)", score };
  if (score >= 6) return { label: "Worth Considering",     color: "#a8c7fa", bg: "rgba(168,199,250,0.10)", score };
  if (score >= 4) return { label: "Proceed with Caution",  color: "#fdd663", bg: "rgba(253,214,99,0.10)",  score };
  return               { label: "Not Recommended",         color: "#f28b82", bg: "rgba(242,139,130,0.10)", score };
}

function ScoreRing({ score, color }) {
  const r = 26, circ = 2 * Math.PI * r;
  const filled = (score / 10) * circ;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="#282a2c" strokeWidth="5" />
      <circle
        cx="34" cy="34" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="34" y="39" textAnchor="middle" fontSize="15" fontWeight="600" fill={color}>{score}</text>
    </svg>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ summary, pros, cons }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = [
      "── Summary ──",
      summary,
      "",
      "✓ Top Highlights",
      ...pros.map(p => `  • ${p}`),
      "",
      "✗ Areas for Improvement",
      ...cons.map(c => `  • ${c}`),
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        background: "none", border: "1px solid #333538",
        borderRadius: "20px", padding: "7px 16px",
        color: copied ? "#81c995" : "#9aa0a6",
        fontSize: "13px", cursor: "pointer",
        transition: "color 0.2s, border-color 0.2s",
        borderColor: copied ? "#81c99544" : "#333538",
      }}
    >
      {copied ? (
        <>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2"/>
            <path strokeLinecap="round" strokeWidth="2" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Copy results
        </>
      )}
    </button>
  );
}

// ── History sidebar ───────────────────────────────────────────────────────────
function HistorySidebar({ history, onSelect, onClear, onClose }) {
  return (
    <aside style={{
      position: "fixed", top: 0, right: 0, height: "100vh", width: "272px",
      background: "#1a1b1c", borderLeft: "1px solid #282a2c",
      display: "flex", flexDirection: "column", zIndex: 50,
      fontFamily: "inherit",
    }}>
      <div style={{
        padding: "18px 20px 14px",
        borderBottom: "1px solid #282a2c",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ color: "#e3e3e3", fontWeight: 500, fontSize: "14px" }}>Recent analyses</span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={onClear} style={{ background: "none", border: "none", color: "#5f6368", fontSize: "12px", cursor: "pointer" }}>
            Clear all
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5f6368", cursor: "pointer", lineHeight: 1 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {history.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(item)}
            style={{
              width: "100%", textAlign: "left", background: "none",
              border: "none", borderBottom: "1px solid #1e1f20",
              padding: "14px 20px", cursor: "pointer",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#222325"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <div style={{
              color: "#e3e3e3", fontSize: "13px", fontWeight: 500, marginBottom: "4px",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {item.title}
            </div>
            <div style={{ color: "#5f6368", fontSize: "11px" }}>{item.time}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Page() {
  const [link, setLink]             = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [pros, setPros]             = useState([]);
  const [cons, setCons]             = useState([]);
  const [summary, setSummary]       = useState("");
  const [history, setHistory]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("insight_history") || "[]");
      setHistory(saved);
    } catch {}
  }, []);

  const pushHistory = (link, result, pros, cons) => {
    const asin = link.match(/\/dp\/([A-Z0-9]+)/i)?.[1];
    const entry = {
      link,
      title: asin ? `ASIN: ${asin}` : link.slice(0, 48) + "…",
      summary: result.summary,
      pros,
      cons,
      time: new Date().toLocaleString("en-US", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      }),
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    try { localStorage.setItem("insight_history", JSON.stringify(updated)); } catch {}
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!link) return;

    setLoading(true);
    setError("");
    setSummary("");
    setPros([]);
    setCons([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/analyze";
      const res = await axios.post(apiUrl, { link });
      const result = res.data.result;

      const cleanPros = [...new Set(result.pros.map(i => Array.isArray(i) ? i[0] : i))];
      const cleanCons = [...new Set(result.cons.map(i => Array.isArray(i) ? i[0] : i))];

      setSummary(result.summary);
      setPros(cleanPros);
      setCons(cleanCons);
      pushHistory(link, result, cleanPros, cleanCons);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Failed to analyze product. Please ensure it is a valid Amazon desktop link.");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item) => {
    setLink(item.link);
    setSummary(item.summary);
    setPros(item.pros);
    setCons(item.cons);
    setError("");
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem("insight_history"); } catch {}
    setShowHistory(false);
  };

  const reset = () => {
    setLink(""); setSummary(""); setPros([]); setCons([]); setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hasResults = !!summary && !loading;
  const verdict    = hasResults ? getVerdict(pros, cons) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 24px",
        paddingRight: showHistory ? "296px" : "24px",
        transition: "padding-right 0.3s ease",
      }}
    >
      {/* Top-right controls */}
      <div style={{
        position: "fixed", top: "20px",
        right: showHistory ? "288px" : "20px",
        display: "flex", gap: "8px", zIndex: 40,
        transition: "right 0.3s ease",
      }}>
        {hasResults && (
          <button
            onClick={reset}
            style={{
              background: "#1e1f20", border: "1px solid #333538",
              color: "#9aa0a6", borderRadius: "20px",
              padding: "7px 16px", fontSize: "13px", cursor: "pointer",
            }}
          >
            ← New analysis
          </button>
        )}
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(s => !s)}
            style={{
              background: showHistory ? "#282a2c" : "#1e1f20",
              border: "1px solid #333538",
              color: showHistory ? "#e3e3e3" : "#9aa0a6",
              borderRadius: "20px", padding: "7px 16px",
              fontSize: "13px", cursor: "pointer",
            }}
          >
            History ({history.length})
          </button>
        )}
      </div>

      {/* History sidebar */}
      {showHistory && (
        <HistorySidebar
          history={history}
          onSelect={loadFromHistory}
          onClear={clearHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      <div style={{ width: "100%", maxWidth: "820px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Greeting */}
        {!hasResults && !loading && (
          <div className="animate-fade-in" style={{ width: "100%", textAlign: "center", marginBottom: "48px" }}>
            <h1 style={{
              fontSize: "clamp(60px, 10vw, 96px)", fontWeight: 500,
              letterSpacing: "-3px", lineHeight: 1, margin: "0 0 16px",
              background: "linear-gradient(90deg, #4285f4, #9b72cb, #d96570)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Hello.
            </h1>
            <p style={{
              fontSize: "clamp(22px, 4vw, 40px)", fontWeight: 400,
              color: "#5f6368", letterSpacing: "-0.5px", margin: 0,
            }}>
              What shall we analyze today?
            </p>
          </div>
        )}

        {/* Input */}
        <div style={{ width: "100%", position: "relative" }}>
          <form onSubmit={handleSubmit} style={{ position: "relative", width: "100%" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Paste Amazon product link here..."
              value={link}
              onChange={e => setLink(e.target.value)}
              disabled={loading}
              onFocus={e  => { e.target.style.background = "#282a2c"; e.target.style.borderColor = "#444746"; }}
              onBlur={e   => { e.target.style.background = "#1e1f20"; e.target.style.borderColor = "transparent"; }}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#1e1f20", border: "1px solid transparent",
                borderRadius: "48px", color: "#e3e3e3",
                fontSize: "clamp(15px, 2.2vw, 22px)",
                padding: "20px 80px 20px 28px",
                outline: "none", transition: "background 0.2s, border-color 0.2s",
              }}
            />
            <button
              type="submit"
              disabled={loading || !link}
              style={{
                position: "absolute", right: "12px", top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", borderRadius: "50%",
                color: "#a8c7fa", padding: "10px", cursor: "pointer",
                opacity: (!link || loading) ? 0.3 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {loading ? (
                <svg className="animate-spin" width="28" height="28" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
                  <path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : (
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: "rotate(90deg)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              )}
            </button>
          </form>

          {error && (
            <p style={{ color: "#f28b82", marginTop: "16px", textAlign: "center", fontSize: "15px" }}>
              {error}
            </p>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ width: "100%", marginTop: "48px", display: "flex", flexDirection: "column", gap: "14px", opacity: 0.7 }}>
            {[["75%", "0s"], ["100%", "0.12s"], ["85%", "0.24s"]].map(([w, delay], i) => (
              <div
                key={i}
                className="animate-pulse-skeleton"
                style={{ height: "20px", borderRadius: "20px", background: "#1e1f20", width: w, animationDelay: delay }}
              />
            ))}
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="animate-fade-in" style={{ width: "100%", marginTop: "48px" }}>
            <div style={{ display: "flex", gap: "20px", width: "100%" }}>

              {/* Avatar */}
              <div style={{
                flexShrink: 0, width: "44px", height: "44px", borderRadius: "50%",
                background: "linear-gradient(135deg, #4285f4, #9b72cb)",
                display: "flex", alignItems: "center", justifyContent: "center", marginTop: "6px",
              }}>
                <svg width="22" height="22" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>

                {/* Verdict + copy row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    background: verdict.bg,
                    border: `1px solid ${verdict.color}33`,
                    borderRadius: "20px", padding: "10px 20px 10px 10px",
                    color: verdict.color,
                  }}>
                    <ScoreRing score={verdict.score} color={verdict.color} />
                    <div>
                      <div style={{ fontSize: "11px", opacity: 0.65, marginBottom: "3px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Verdict
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 600 }}>{verdict.label}</div>
                    </div>
                  </div>

                  <CopyButton summary={summary} pros={pros} cons={cons} />
                </div>

                {/* Summary */}
                <div style={{
                  background: "rgba(30,31,32,0.5)", border: "1px solid #282a2c",
                  borderRadius: "28px", padding: "24px 28px",
                  fontSize: "clamp(15px, 1.6vw, 18px)", lineHeight: 1.8, color: "#e3e3e3",
                }}>
                  {summary}
                </div>

                {/* Pros & Cons grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
                  {[
                    {
                      items: pros, label: "Top highlights", color: "#81c995",
                      iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                    },
                    {
                      items: cons, label: "Areas for improvement", color: "#f28b82",
                      iconPath: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
                    },
                  ].map(({ items, label, color, iconPath }) => (
                    <div key={label}>
                      <h3 style={{
                        color, fontWeight: 500, fontSize: "15px",
                        marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px",
                      }}>
                        <svg width="18" height="18" fill="none" stroke={color} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={iconPath}/>
                        </svg>
                        {label}
                      </h3>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                        {items.map((item, idx) => (
                          <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", lineHeight: 1.65, color: "#c4c7c5" }}>
                            <span style={{ color: "#444746", fontSize: "18px", lineHeight: "1.35", flexShrink: 0 }}>•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}