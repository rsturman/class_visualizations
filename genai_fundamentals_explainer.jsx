import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "tokens", label: "1. Tokens", subtitle: "The currency of AI" },
  { id: "prediction", label: "2. Prediction", subtitle: "How LLMs think" },
  { id: "temperature", label: "3. Temperature", subtitle: "Controlling creativity" },
  { id: "context", label: "4. Context Window", subtitle: "Memory limits" },
  { id: "prompting", label: "5. Prompt Architecture", subtitle: "Designing instructions" },
];

const TOKEN_EXAMPLES = {
  "The hospital needs a better patient intake process.": [
    "The", " hospital", " needs", " a", " better", " patient", " intake", " process", "."
  ],
  "Implement a retrieval-augmented generation system": [
    "Implement", " a", " retrieval", "-", "aug", "mented", " generation", " system"
  ],
  "Our Q3 revenue exceeded expectations by 12%": [
    "Our", " Q", "3", " revenue", " exceeded", " expectations", " by", " ", "12", "%"
  ],
  "¿Podemos automatizar este proceso?": [
    "¿", "Pod", "emos", " autom", "atizar", " este", " proceso", "?"
  ],
};

const PREDICTION_STEPS = [
  {
    context: "The patient intake process currently takes",
    candidates: [
      { word: "approximately", prob: 0.32 },
      { word: "about", prob: 0.24 },
      { word: "too", prob: 0.18 },
      { word: "an", prob: 0.14 },
      { word: "several", prob: 0.12 },
    ],
    chosen: "too",
    explanation: "The model looks at all preceding tokens and calculates a probability for every possible next token in its vocabulary — often 50,000+ options."
  },
  {
    context: "The patient intake process currently takes too",
    candidates: [
      { word: "long", prob: 0.61 },
      { word: "much", prob: 0.22 },
      { word: "many", prob: 0.09 },
      { word: "few", prob: 0.05 },
      { word: "little", prob: 0.03 },
    ],
    chosen: "long",
    explanation: "With 'too' as context, the probability distribution shifts dramatically. 'Long' becomes the clear favorite because the model has seen this pattern thousands of times in training data."
  },
  {
    context: "The patient intake process currently takes too long",
    candidates: [
      { word: ",", prob: 0.35 },
      { word: ".", prob: 0.28 },
      { word: " and", prob: 0.15 },
      { word: " for", prob: 0.12 },
      { word: " —", prob: 0.10 },
    ],
    chosen: ",",
    explanation: "Even punctuation is predicted token by token. The model treats commas, periods, and dashes as tokens with their own probability distributions."
  },
];

const PROMPT_ROLES = {
  system: {
    color: "#c05621",
    label: "System Message",
    description: "Sets behavior, personality, and constraints. The user typically never sees this.",
    example: "You are a claims processing assistant for Northwind Insurance. Only answer questions about active claims. If asked about policy pricing, direct the user to their agent. Always cite the claim number in your response.",
    orgNote: "This is where organizations embed their business rules, compliance requirements, and brand voice. It's the most important control surface for enterprise AI."
  },
  user: {
    color: "#2b6cb0",
    label: "User Message",
    description: "The actual question or request from the end user.",
    example: "What's the status of claim #NW-2024-8891? The adjuster said they'd have an update by Friday.",
    orgNote: "In production, user messages are often augmented with retrieved context (RAG) before being sent to the model — the user doesn't see this enrichment."
  },
  assistant: {
    color: "#276749",
    label: "Assistant Response",
    description: "The model's generated response, shaped by both system and user messages.",
    example: "Claim #NW-2024-8891 (water damage, filed 11/3) is currently in adjuster review. The most recent note from 11/15 indicates the site inspection is complete and the estimate is being finalized. Expected next update: November 22.",
    orgNote: "The quality of this output is directly determined by how well the system message and retrieved context were designed — not just by which model you pick."
  }
};

// ─── Shared Components ───────────────────────────────────────────────────
const OrgCallout = ({ children }) => (
  <div style={{
    margin: "20px 0",
    padding: "16px 20px",
    borderLeft: "3px solid #c05621",
    background: "#fffaf0",
    borderRadius: "0 6px 6px 0",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#744210",
  }}>
    <span style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>
      Why this matters for organizations
    </span>
    {children}
  </div>
);

const SectionHeader = ({ number, title, subtitle }) => (
  <div style={{ marginBottom: "32px" }}>
    <div style={{ fontSize: "12px", fontWeight: 600, color: "#c05621", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
      Module {number}
    </div>
    <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#1a202c", margin: "0 0 8px 0", fontFamily: "'Georgia', serif" }}>
      {title}
    </h2>
    <p style={{ fontSize: "16px", color: "#718096", margin: 0, fontStyle: "italic" }}>{subtitle}</p>
  </div>
);

// ─── Section 1: Tokens ──────────────────────────────────────────────────
const TokenSection = () => {
  const [selectedExample, setSelectedExample] = useState(Object.keys(TOKEN_EXAMPLES)[0]);
  const [highlightedIdx, setHighlightedIdx] = useState(null);
  const [showCost, setShowCost] = useState(false);
  const tokens = TOKEN_EXAMPLES[selectedExample];
  const costPerMToken = 3.0; // rough avg $/1M input tokens

  return (
    <div>
      <SectionHeader number="1" title="Tokens: The Currency of AI" subtitle="LLMs don't read words — they read tokens. Understanding tokens means understanding costs." />

      <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#2d3748", marginBottom: "20px" }}>
        Before an LLM processes any text, it breaks it into <strong>tokens</strong> — fragments that might be whole words, parts of words, or single characters. A rough rule of thumb: <strong>1 token ≈ ¾ of a word</strong> in English. Other languages often require more tokens for the same meaning.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
          Select an example to tokenize
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {Object.keys(TOKEN_EXAMPLES).map((ex) => (
            <button
              key={ex}
              onClick={() => { setSelectedExample(ex); setHighlightedIdx(null); }}
              style={{
                padding: "8px 14px",
                border: selectedExample === ex ? "2px solid #c05621" : "1px solid #e2e8f0",
                borderRadius: "6px",
                background: selectedExample === ex ? "#fffaf0" : "#fff",
                color: selectedExample === ex ? "#c05621" : "#4a5568",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: selectedExample === ex ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Token visualization */}
      <div style={{
        background: "#f7fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "16px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
          Input text → {tokens.length} tokens
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {tokens.map((t, i) => (
            <span
              key={i}
              onMouseEnter={() => setHighlightedIdx(i)}
              onMouseLeave={() => setHighlightedIdx(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: "4px",
                fontFamily: "'Courier New', monospace",
                fontSize: "14px",
                fontWeight: 500,
                background: highlightedIdx === i ? "#c05621" : `hsl(${(i * 37) % 360}, 55%, 92%)`,
                color: highlightedIdx === i ? "#fff" : "#2d3748",
                border: `1px solid ${highlightedIdx === i ? "#c05621" : `hsl(${(i * 37) % 360}, 45%, 80%)`}`,
                cursor: "default",
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              {t === " " ? "⎵" : t.replace(/ /g, "·")}
              <span style={{
                marginLeft: "6px",
                fontSize: "10px",
                opacity: 0.6,
                fontFamily: "sans-serif",
              }}>
                #{i + 1}
              </span>
            </span>
          ))}
        </div>

        <div style={{ fontSize: "13px", color: "#718096", lineHeight: 1.6 }}>
          {highlightedIdx !== null ? (
            <>Token #{highlightedIdx + 1}: "<strong>{tokens[highlightedIdx].replace(/ /g, "·")}</strong>" — {tokens[highlightedIdx].startsWith(" ") ? "note the leading space, which is part of the token" : tokens[highlightedIdx].length === 1 ? "a single character token (punctuation or part of a word)" : "this fragment maps to one entry in the model's vocabulary"}</>
          ) : (
            "Hover over any token to learn more about it."
          )}
        </div>
      </div>

      {/* Cost calculator */}
      <button
        onClick={() => setShowCost(!showCost)}
        style={{
          padding: "10px 18px",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          background: showCost ? "#1a202c" : "#fff",
          color: showCost ? "#fff" : "#1a202c",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          transition: "all 0.15s",
          marginBottom: "16px",
        }}
      >
        {showCost ? "Hide" : "Show"} Cost Calculator →
      </button>

      {showCost && (
        <div style={{
          background: "#1a202c",
          borderRadius: "8px",
          padding: "24px",
          color: "#e2e8f0",
          marginBottom: "16px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#c05621", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Token Cost Estimator
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#a0aec0", marginBottom: "4px" }}>This prompt</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{tokens.length} <span style={{ fontSize: "14px", fontWeight: 400 }}>tokens</span></div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#a0aec0", marginBottom: "4px" }}>Cost at ~$3/1M tokens</div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>${(tokens.length * costPerMToken / 1000000).toFixed(6)}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#a0aec0", marginBottom: "4px" }}>1,000 users × 50 queries/day</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#fc8181" }}>${(tokens.length * costPerMToken / 1000000 * 1000 * 50 * 30).toFixed(2)}<span style={{ fontSize: "14px", fontWeight: 400 }}>/mo</span></div>
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#718096", marginTop: "12px" }}>
            Note: This is input cost only. Output tokens (the response) typically cost 3–4× more. Actual pricing varies by provider and model.
          </div>
        </div>
      )}

      <OrgCallout>
        Every API call to an LLM is billed by tokens — both input and output. A verbose system prompt, a chunk of retrieved context, and the user's question all consume tokens <em>before the model writes a single word of response</em>. Gartner research finds that token costs are among the most underestimated expenses when organizations move GenAI pilots to production scale. Understanding tokenization isn't just technical trivia — it's the basis for forecasting operational costs.
      </OrgCallout>
    </div>
  );
};

// ─── Section 2: Next-Token Prediction ───────────────────────────────────
const PredictionSection = () => {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [showBars, setShowBars] = useState(true);
  const current = PREDICTION_STEPS[step];

  const handleStep = (newStep) => {
    setShowBars(false);
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setShowBars(true);
      setAnimating(false);
    }, 200);
  };

  return (
    <div>
      <SectionHeader number="2" title="Next-Token Prediction" subtitle="LLMs generate text one token at a time by predicting what comes next." />

      <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#2d3748", marginBottom: "24px" }}>
        An LLM doesn't "understand" language the way humans do. It's a <strong>probabilistic prediction engine</strong>: given everything that came before, it calculates a probability distribution over its entire vocabulary and picks one token. Then it adds that token to the context and repeats. The entire output is produced this way — one token at a time.
      </p>

      {/* Context display */}
      <div style={{
        background: "#f7fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px",
        fontFamily: "'Georgia', serif",
        fontSize: "18px",
        lineHeight: 1.8,
        color: "#2d3748",
      }}>
        {current.context}
        <span style={{
          display: "inline-block",
          width: "12px",
          height: "24px",
          background: "#c05621",
          borderRadius: "2px",
          marginLeft: "4px",
          verticalAlign: "text-bottom",
          animation: "blink 1s infinite",
        }} />
        <style>{`@keyframes blink { 0%, 50% { opacity: 1 } 51%, 100% { opacity: 0 } }`}</style>
      </div>

      {/* Probability bars */}
      <div style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "16px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
          Predicted next token — probability distribution
        </div>
        {current.candidates.map((c, i) => (
          <div key={c.word} style={{ display: "flex", alignItems: "center", marginBottom: "10px", opacity: showBars ? 1 : 0, transition: "opacity 0.2s", transitionDelay: `${i * 60}ms` }}>
            <div style={{ width: "100px", fontFamily: "'Courier New', monospace", fontSize: "14px", fontWeight: c.word === current.chosen ? 700 : 400, color: c.word === current.chosen ? "#c05621" : "#4a5568" }}>
              "{c.word}"
            </div>
            <div style={{ flex: 1, marginRight: "12px" }}>
              <div style={{
                height: "28px",
                borderRadius: "4px",
                background: c.word === current.chosen
                  ? "linear-gradient(90deg, #c05621, #ed8936)"
                  : "#e2e8f0",
                width: showBars ? `${c.prob * 100}%` : "0%",
                transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transitionDelay: `${i * 80}ms`,
                display: "flex",
                alignItems: "center",
                paddingLeft: "8px",
              }}>
                {c.prob >= 0.15 && (
                  <span style={{ fontSize: "12px", fontWeight: 600, color: c.word === current.chosen ? "#fff" : "#4a5568" }}>
                    {(c.prob * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div style={{ width: "45px", textAlign: "right", fontSize: "13px", color: "#a0aec0" }}>
              {(c.prob * 100).toFixed(0)}%
            </div>
          </div>
        ))}
        {current.chosen && (
          <div style={{ marginTop: "12px", fontSize: "13px", color: "#c05621", fontWeight: 500 }}>
            → Selected: "<strong>{current.chosen}</strong>" {step < 2 ? "(not always the highest probability — that's where temperature comes in)" : ""}
          </div>
        )}
      </div>

      <div style={{ fontSize: "14px", color: "#4a5568", lineHeight: 1.7, marginBottom: "16px", padding: "12px 16px", background: "#f7fafc", borderRadius: "6px" }}>
        {current.explanation}
      </div>

      {/* Step navigation */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {PREDICTION_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => handleStep(i)}
            disabled={animating}
            style={{
              padding: "8px 16px",
              border: step === i ? "2px solid #c05621" : "1px solid #e2e8f0",
              borderRadius: "6px",
              background: step === i ? "#fffaf0" : "#fff",
              color: step === i ? "#c05621" : "#4a5568",
              cursor: animating ? "default" : "pointer",
              fontSize: "13px",
              fontWeight: step === i ? 600 : 400,
              opacity: animating ? 0.5 : 1,
            }}
          >
            Step {i + 1}
          </button>
        ))}
      </div>

      <OrgCallout>
        Because LLMs are probabilistic, they can produce different outputs for the same input. This isn't a bug — it's fundamental to the architecture. For organizations, this means: you cannot treat an LLM like a deterministic database query. Every deployment needs testing, evaluation criteria, and a plan for output variability. This is why the Gartner prompt engineering architecture emphasizes grounding and guardrails as structural requirements, not nice-to-haves.
      </OrgCallout>
    </div>
  );
};

// ─── Section 3: Temperature ─────────────────────────────────────────────
const TemperatureSection = () => {
  const [temp, setTemp] = useState(0.7);
  const [outputs, setOutputs] = useState([]);

  const baseProbs = [
    { word: "efficient", base: 0.35 },
    { word: "streamlined", base: 0.25 },
    { word: "automated", base: 0.20 },
    { word: "revolutionary", base: 0.10 },
    { word: "chaotic", base: 0.05 },
    { word: "unprecedented", base: 0.05 },
  ];

  const adjustProbs = useCallback((t) => {
    if (t === 0) {
      return baseProbs.map((p, i) => ({ ...p, adj: i === 0 ? 1.0 : 0.0 }));
    }
    const logits = baseProbs.map(p => Math.log(p.base) / t);
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((a, b) => a + b, 0);
    return baseProbs.map((p, i) => ({ ...p, adj: exps[i] / sum }));
  }, []);

  const adjusted = adjustProbs(temp);

  const sampleWord = () => {
    const r = Math.random();
    let cumulative = 0;
    for (const p of adjusted) {
      cumulative += p.adj;
      if (r <= cumulative) return p.word;
    }
    return adjusted[adjusted.length - 1].word;
  };

  const generateSample = () => {
    const words = [];
    for (let i = 0; i < 6; i++) words.push(sampleWord());
    setOutputs(prev => [{ temp: temp.toFixed(1), words: words.join(", "), id: Date.now() }, ...prev].slice(0, 5));
  };

  const tempLabel = temp <= 0.2 ? "Deterministic" : temp <= 0.5 ? "Focused" : temp <= 0.8 ? "Balanced" : temp <= 1.2 ? "Creative" : "Wild";
  const tempColor = temp <= 0.3 ? "#2b6cb0" : temp <= 0.7 ? "#276749" : temp <= 1.0 ? "#c05621" : "#e53e3e";

  return (
    <div>
      <SectionHeader number="3" title="Temperature" subtitle="A single parameter that controls how 'creative' or 'predictable' the model behaves." />

      <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#2d3748", marginBottom: "24px" }}>
        Temperature reshapes the probability distribution before a token is selected. Low temperature makes the model concentrate probability on the top candidates (more predictable). High temperature flattens the distribution, giving less likely tokens a real chance (more varied, sometimes surprising).
      </p>

      {/* Temperature slider */}
      <div style={{
        background: "#f7fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em" }}>Temperature</div>
            <div style={{ fontSize: "32px", fontWeight: 700, color: tempColor, fontFamily: "'Courier New', monospace" }}>{temp.toFixed(1)}</div>
          </div>
          <div style={{
            padding: "6px 14px",
            borderRadius: "20px",
            background: tempColor,
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
          }}>
            {tempLabel}
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="1.5"
          step="0.1"
          value={temp}
          onChange={(e) => setTemp(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: tempColor, height: "8px", marginBottom: "8px" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#a0aec0" }}>
          <span>0.0 — Deterministic</span>
          <span>0.7 — Default</span>
          <span>1.5 — Very creative</span>
        </div>
      </div>

      {/* Adjusted distribution */}
      <div style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "16px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
          Prompt: "The new process will be ___"
        </div>
        <div style={{ fontSize: "11px", color: "#a0aec0", marginBottom: "16px" }}>
          Adjusted probability distribution at temperature {temp.toFixed(1)}
        </div>
        {adjusted.map((p) => (
          <div key={p.word} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ width: "120px", fontFamily: "'Courier New', monospace", fontSize: "13px", color: "#4a5568" }}>
              {p.word}
            </div>
            <div style={{ flex: 1, marginRight: "12px" }}>
              <div style={{
                height: "24px",
                borderRadius: "4px",
                background: `linear-gradient(90deg, ${tempColor}dd, ${tempColor}88)`,
                width: `${p.adj * 100}%`,
                transition: "width 0.4s ease",
                minWidth: p.adj > 0.005 ? "3px" : "0",
              }} />
            </div>
            <div style={{ width: "50px", textAlign: "right", fontSize: "12px", color: "#a0aec0", fontFamily: "'Courier New', monospace" }}>
              {(p.adj * 100).toFixed(1)}%
            </div>
          </div>
        ))}

        <button
          onClick={generateSample}
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            border: "none",
            borderRadius: "6px",
            background: tempColor,
            color: "#fff",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            transition: "background 0.2s",
          }}
        >
          Sample 6 words at this temperature →
        </button>

        {outputs.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            {outputs.map((o) => (
              <div key={o.id} style={{ fontSize: "13px", color: "#4a5568", padding: "6px 0", borderBottom: "1px solid #f7fafc" }}>
                <span style={{ color: "#a0aec0", fontFamily: "'Courier New', monospace", marginRight: "8px" }}>t={o.temp}</span>
                {o.words}
              </div>
            ))}
          </div>
        )}
      </div>

      <OrgCallout>
        Temperature is one of the most impactful parameters for enterprise use cases — and one of the most misunderstood. A customer service chatbot should typically run at low temperature (0.0–0.3) for consistent, predictable responses. A marketing copy generator benefits from higher temperature (0.7–1.0) for variety. Choosing the wrong temperature for your use case is a governance issue, not just a technical preference: it directly affects output reliability and user trust.
      </OrgCallout>
    </div>
  );
};

// ─── Section 4: Context Window ──────────────────────────────────────────
const ContextWindowSection = () => {
  const [windowSize, setWindowSize] = useState(128000);
  const [systemLen, setSystemLen] = useState(2000);
  const [ragLen, setRagLen] = useState(8000);
  const [historyLen, setHistoryLen] = useState(4000);
  const [userLen, setUserLen] = useState(500);

  const totalUsed = systemLen + ragLen + historyLen + userLen;
  const outputBudget = Math.max(0, windowSize - totalUsed);
  const pctUsed = Math.min(100, (totalUsed / windowSize) * 100);

  const segments = [
    { label: "System prompt", tokens: systemLen, color: "#c05621", setter: setSystemLen },
    { label: "Retrieved context (RAG)", tokens: ragLen, color: "#2b6cb0", setter: setRagLen },
    { label: "Conversation history", tokens: historyLen, color: "#6b46c1", setter: setHistoryLen },
    { label: "User message", tokens: userLen, color: "#276749", setter: setUserLen },
  ];

  return (
    <div>
      <SectionHeader number="4" title="The Context Window" subtitle="Every LLM has a fixed memory — everything must fit inside it." />

      <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#2d3748", marginBottom: "24px" }}>
        The context window is the <strong>total number of tokens</strong> an LLM can process in a single request — input and output combined. Think of it as working memory: everything the model needs to know (instructions, retrieved documents, conversation history, the user's question) plus room for the response must fit inside this window. Anything that doesn't fit is invisible to the model.
      </p>

      {/* Window size selector */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#718096", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
          Model context window size
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { label: "GPT-3.5 (4K)", size: 4096 },
            { label: "Claude Haiku (200K)", size: 200000 },
            { label: "GPT-4o (128K)", size: 128000 },
            { label: "Gemini 2.0 (1M)", size: 1000000 },
          ].map((m) => (
            <button
              key={m.size}
              onClick={() => setWindowSize(m.size)}
              style={{
                padding: "8px 14px",
                border: windowSize === m.size ? "2px solid #1a202c" : "1px solid #e2e8f0",
                borderRadius: "6px",
                background: windowSize === m.size ? "#1a202c" : "#fff",
                color: windowSize === m.size ? "#fff" : "#4a5568",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: windowSize === m.size ? 600 : 400,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Window visualization */}
      <div style={{
        background: "#f7fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "20px",
      }}>
        {/* Bar */}
        <div style={{ height: "40px", borderRadius: "6px", background: "#e2e8f0", display: "flex", overflow: "hidden", marginBottom: "16px" }}>
          {segments.map((seg) => {
            const pct = (seg.tokens / windowSize) * 100;
            return pct > 0.3 ? (
              <div key={seg.label} style={{
                width: `${pct}%`,
                background: seg.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 600,
                minWidth: pct > 2 ? undefined : "3px",
                transition: "width 0.3s ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}>
                {pct > 5 ? `${(pct).toFixed(0)}%` : ""}
              </div>
            ) : null;
          })}
          {outputBudget > 0 && (
            <div style={{
              width: `${(outputBudget / windowSize) * 100}%`,
              background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 600,
              color: "#718096",
              transition: "width 0.3s ease",
            }}>
              {(outputBudget / windowSize) * 100 > 10 ? "← Output budget →" : ""}
            </div>
          )}
        </div>

        {/* Sliders */}
        {segments.map((seg) => (
          <div key={seg.label} style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: seg.color, display: "inline-block" }} />
                {seg.label}
              </span>
              <span style={{ fontFamily: "'Courier New', monospace", color: "#718096" }}>
                {seg.tokens.toLocaleString()} tokens
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.min(windowSize, 50000)}
              step="500"
              value={seg.tokens}
              onChange={(e) => seg.setter(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: seg.color }}
            />
          </div>
        ))}

        {/* Summary */}
        <div style={{
          marginTop: "16px",
          padding: "12px 16px",
          borderRadius: "6px",
          background: outputBudget < 1000 ? "#fff5f5" : "#f0fff4",
          border: `1px solid ${outputBudget < 1000 ? "#fed7d7" : "#c6f6d5"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 600 }}>
            <span>Input used: {totalUsed.toLocaleString()} / {windowSize.toLocaleString()}</span>
            <span style={{ color: outputBudget < 1000 ? "#e53e3e" : "#276749" }}>
              Output budget: {outputBudget.toLocaleString()} tokens
              {outputBudget < 1000 && " ⚠️ Very limited!"}
            </span>
          </div>
        </div>
      </div>

      <OrgCallout>
        Context window management is a real engineering constraint. If your RAG system retrieves too many documents, you squeeze the output budget. If your system prompt is too verbose, every single API call pays for those extra tokens. Organizations often discover this the hard way: a system that works well in testing (short conversations) degrades in production (long conversations that eat the context window). Gartner notes that managing the trade-off between grounding data volume and token costs is one of the primary challenges in enterprise RAG deployments.
      </OrgCallout>
    </div>
  );
};

// ─── Section 5: Prompt Architecture ─────────────────────────────────────
const PromptingSection = () => {
  const [activeRole, setActiveRole] = useState("system");
  const [showFull, setShowFull] = useState(false);
  const role = PROMPT_ROLES[activeRole];

  return (
    <div>
      <SectionHeader number="5" title="Prompt Architecture" subtitle="System, user, and assistant messages — the three layers of every LLM interaction." />

      <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#2d3748", marginBottom: "24px" }}>
        Modern LLMs use a <strong>role-based message format</strong>. Every API call sends an array of messages, each tagged with a role. This structure is how organizations control model behavior, inject retrieved context, and maintain conversational state. The design of these messages — especially the system prompt — is the primary lever for output quality.
      </p>

      {/* Role selector */}
      <div style={{ display: "flex", gap: "0", marginBottom: "0", borderRadius: "8px 8px 0 0", overflow: "hidden", border: "1px solid #e2e8f0", borderBottom: "none" }}>
        {Object.entries(PROMPT_ROLES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setActiveRole(key)}
            style={{
              flex: 1,
              padding: "14px 16px",
              border: "none",
              borderBottom: activeRole === key ? `3px solid ${val.color}` : "3px solid transparent",
              background: activeRole === key ? "#fff" : "#f7fafc",
              color: activeRole === key ? val.color : "#718096",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: activeRole === key ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Role detail */}
      <div style={{
        border: "1px solid #e2e8f0",
        borderRadius: "0 0 8px 8px",
        padding: "24px",
        marginBottom: "20px",
        borderTop: `3px solid ${role.color}`,
      }}>
        <p style={{ fontSize: "14px", color: "#4a5568", lineHeight: 1.6, marginTop: 0, marginBottom: "16px" }}>
          {role.description}
        </p>

        <div style={{
          background: "#1a202c",
          borderRadius: "6px",
          padding: "16px 20px",
          fontFamily: "'Courier New', monospace",
          fontSize: "13px",
          lineHeight: 1.7,
          color: "#e2e8f0",
          whiteSpace: "pre-wrap",
          marginBottom: "16px",
        }}>
          <span style={{ color: role.color, fontWeight: 700 }}>
            {`{ "role": "${activeRole}" }`}
          </span>
          {"\n\n"}
          {role.example}
        </div>

        <div style={{
          padding: "12px 16px",
          background: "#f7fafc",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#4a5568",
          lineHeight: 1.6,
          borderLeft: `3px solid ${role.color}`,
        }}>
          <strong>Implementation note:</strong> {role.orgNote}
        </div>
      </div>

      {/* Full message assembly */}
      <button
        onClick={() => setShowFull(!showFull)}
        style={{
          padding: "10px 18px",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          background: showFull ? "#1a202c" : "#fff",
          color: showFull ? "#fff" : "#1a202c",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        {showFull ? "Hide" : "Show"} full API call assembly →
      </button>

      {showFull && (
        <div style={{
          background: "#1a202c",
          borderRadius: "8px",
          padding: "20px",
          fontFamily: "'Courier New', monospace",
          fontSize: "12px",
          lineHeight: 1.8,
          color: "#e2e8f0",
          whiteSpace: "pre-wrap",
          marginBottom: "20px",
          overflowX: "auto",
        }}>
          <span style={{ color: "#718096" }}>{"// This is what your application sends to the API\n"}</span>
          <span style={{ color: "#a0aec0" }}>{"messages: [\n"}</span>
          <span style={{ color: "#c05621" }}>{"  { role: \"system\",\n    content: \""}</span>{"You are a claims assistant..."}<span style={{ color: "#c05621" }}>{"\" },\n"}</span>
          <span style={{ color: "#718096" }}>{"  // ↑ Set once by the development team\n\n"}</span>
          <span style={{ color: "#6b46c1" }}>{"  { role: \"user\",\n    content: \""}</span>{"[Retrieved context from RAG]\nWhat's the status of claim #NW-2024-8891?"}<span style={{ color: "#6b46c1" }}>{"\" },\n"}</span>
          <span style={{ color: "#718096" }}>{"  // ↑ Constructed at runtime: RAG results + user input\n\n"}</span>
          <span style={{ color: "#276749" }}>{"  { role: \"assistant\",\n    content: \""}</span>{"..."}<span style={{ color: "#276749" }}>{"\" }\n"}</span>
          <span style={{ color: "#718096" }}>{"  // ↑ Generated by the model\n"}</span>
          <span style={{ color: "#a0aec0" }}>{"]\n"}</span>
          <span style={{ color: "#718096" }}>{"\ntemperature: 0.2"}</span>
          <span style={{ color: "#718096" }}>{"\n// ↑ Low for factual accuracy"}</span>
        </div>
      )}

      <OrgCallout>
        In production systems, the end user typically interacts only with what looks like a simple chat box. Behind the scenes, the application constructs a carefully engineered message array: a system prompt encoding business rules, retrieved context from a knowledge base (RAG), conversation history for continuity, and the user's actual question. Designing this architecture — deciding what goes in the system prompt, what gets retrieved, and how much history to retain — is the core work of implementing a GenAI system. The model is just the engine; the prompt architecture is the steering.
      </OrgCallout>
    </div>
  );
};

// ─── Main App ───────────────────────────────────────────────────────────
export default function GenAIFundamentals() {
  const [activeSection, setActiveSection] = useState("tokens");
  const [menuOpen, setMenuOpen] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "tokens": return <TokenSection />;
      case "prediction": return <PredictionSection />;
      case "temperature": return <TemperatureSection />;
      case "context": return <ContextWindowSection />;
      case "prompting": return <PromptingSection />;
      default: return <TokenSection />;
    }
  };

  const currentIdx = SECTIONS.findIndex(s => s.id === activeSection);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #e2e8f0",
        padding: "16px 24px",
        background: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1a202c", margin: 0, fontFamily: "'Georgia', serif" }}>
                Generative AI Fundamentals
              </h1>
              <div style={{ fontSize: "12px", color: "#a0aec0", marginTop: "2px" }}>
                IMT 598J · Interactive Explainer
              </div>
            </div>
            {/* Desktop nav */}
            <div style={{ display: "flex", gap: "4px" }}>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSection(s.id); setMenuOpen(false); }}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    borderRadius: "4px",
                    background: activeSection === s.id ? "#1a202c" : "transparent",
                    color: activeSection === s.id ? "#fff" : "#718096",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: activeSection === s.id ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {renderSection()}

        {/* Navigation */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "48px",
          paddingTop: "24px",
          borderTop: "1px solid #e2e8f0",
        }}>
          {currentIdx > 0 ? (
            <button
              onClick={() => setActiveSection(SECTIONS[currentIdx - 1].id)}
              style={{
                padding: "10px 18px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                background: "#fff",
                color: "#4a5568",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              ← {SECTIONS[currentIdx - 1].label}
            </button>
          ) : <div />}
          {currentIdx < SECTIONS.length - 1 ? (
            <button
              onClick={() => setActiveSection(SECTIONS[currentIdx + 1].id)}
              style={{
                padding: "10px 18px",
                border: "none",
                borderRadius: "6px",
                background: "#1a202c",
                color: "#fff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {SECTIONS[currentIdx + 1].label} →
            </button>
          ) : (
            <div style={{ fontSize: "14px", color: "#276749", fontWeight: 600, padding: "10px 0" }}>
              ✓ All modules complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
