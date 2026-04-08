import { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldAlert,
  Database,
  Upload,
  Zap,
  XCircle,
  Download,
  RefreshCw,
  Terminal,
  Lock,
  Unlock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Activity,
} from "lucide-react";

const API_KEY = "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";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "z-ai/glm-4.5-air:free";

const LOADING_TEXTS = [
  "INITIALIZING ENGINE...",
  "CONNECTING TO NEURAL CORE...",
  "EXTRACTING LAYERS...",
  "RUNNING CHAIN OF THOUGHT...",
  "DECRYPTING OBFUSCATION...",
  "ANALYZING ENTROPY...",
  "MAPPING CODE STRUCTURE...",
  "RESOLVING DEPENDENCIES...",
  "FINALIZING OUTPUT...",
];

const getSystemPrompt = (mode, level) => {
  if (mode === "DECODE") {
    return `You are KaiiDevID Absolute Decoder — a supreme code analysis engine capable of reverse-engineering any obfuscated, encoded, or minified source code.

Your mission: perform recursive multi-layer decoding using Chain of Thought methodology.

CHAIN OF THOUGHT PROCESS:
1. Identify all encoding/obfuscation layers present (Base64, Hex, ROT13, JSFuck, eval chains, Unicode escapes, XOR, etc.)
2. Decode layer by layer, documenting each step
3. Continue recursively until you reach clean, human-readable source code
4. Verify the output makes logical sense as code

CRITICAL: You MUST respond with ONLY a raw JSON object. NO markdown. NO backticks. NO explanation outside JSON.

Respond EXACTLY in this format:
{"thinking_steps":["step 1 description","step 2 description","step 3 description"],"success":true,"methods_involved":["Base64","Hex","etc"],"output_text":"the fully decoded clean source code here","conclusion":"brief explanation of what was decoded and how many layers were found"}`;
  }
  if (mode === "ENCODE" && level === "Strict") {
    return `You are KaiiDevID Ultimate Obfuscator — a heavyweight code obfuscation engine specializing in maximum entropy obfuscation.

Your mission: transform the provided source code into the most complex obfuscation possible using JSFuck-style encoding, heavy eval packing, string splitting, unicode escaping, and multi-layer wrapping.

OBFUSCATION REQUIREMENTS:
1. Apply JSFuck-style character encoding where possible
2. Use eval() chains with nested function wrappers
3. Convert strings to unicode/hex escape sequences
4. Apply multiple encoding layers (minimum 3 layers)
5. Use base conversion, bitwise operations, and string fromCharCode tricks
6. The result must still be functionally executable code

CRITICAL: You MUST respond with ONLY a raw JSON object. NO markdown. NO backticks. NO explanation outside JSON.

Respond EXACTLY in this format:
{"thinking_steps":["obfuscation step 1","obfuscation step 2","obfuscation step 3"],"success":true,"methods_involved":["JSFuck","eval-chain","unicode-escape","hex-encoding"],"output_text":"the heavily obfuscated code here","conclusion":"description of obfuscation layers applied"}`;
  }
  return `You are KaiiDevID Basic Encoder — a simple encoding utility that applies straightforward, easily reversible encoding.

Your mission: encode the provided source code using basic Base64 and Hex encoding methods.

ENCODING PROCESS:
1. Convert code to Base64 representation
2. Apply simple Hex encoding on top
3. Wrap in a basic eval structure
4. Keep it simple and readable

CRITICAL: You MUST respond with ONLY a raw JSON object. NO markdown. NO backticks. NO explanation outside JSON.

Respond EXACTLY in this format:
{"thinking_steps":["encoding step 1","encoding step 2"],"success":true,"methods_involved":["Base64","Hex"],"output_text":"the encoded result here","conclusion":"basic encoding applied successfully"}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseAIResponse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}
    try {
      const cleaned = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleaned);
    } catch {}
    return {
      thinking_steps: ["Raw response received", "JSON parsing attempted"],
      success: false,
      methods_involved: ["Unknown"],
      output_text: text,
      conclusion: "Could not parse structured response. Raw output shown.",
    };
  }
};

const callAPI = async (content, mode, level, attempt = 0) => {
  const systemPrompt = getSystemPrompt(mode, level);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kaiidevid.app",
        "X-Title": "KaiiDevID Absolute Decoder PROMAX",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Process this code/content:\n\n${content.slice(0, 12000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    return parseAIResponse(raw);
  } catch (err) {
    if (attempt < 2) {
      await sleep(Math.pow(2, attempt) * 1500);
      return callAPI(content, mode, level, attempt + 1);
    }
    throw err;
  }
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function App() {
  const [mode, setMode] = useState("DECODE");
  const [obfLevel, setObfLevel] = useState("Rentan");
  const [fileState, setFileState] = useState("idle"); // idle | reading | ready
  const [fileInfo, setFileInfo] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [consoleState, setConsoleState] = useState("standby"); // standby | loading | error | result
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const fileRef = useRef();
  const loadingIntervalRef = useRef();

  useEffect(() => {
    if (consoleState === "loading") {
      let i = 0;
      loadingIntervalRef.current = setInterval(() => {
        i = (i + 1) % LOADING_TEXTS.length;
        setLoadingIdx(i);
        setLoadingText(LOADING_TEXTS[i]);
      }, 1800);
    } else {
      clearInterval(loadingIntervalRef.current);
    }
    return () => clearInterval(loadingIntervalRef.current);
  }, [consoleState]);

  const readFile = useCallback((file) => {
    if (!file) return;
    setFileState("reading");
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target.result);
      setFileInfo({ name: file.name, size: file.size, type: file.type });
      setFileState("ready");
      setConsoleState("standby");
      setResult(null);
    };
    reader.onerror = () => {
      setFileState("idle");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) readFile(file);
  };

  const execute = async () => {
    if (!fileContent) return;
    setConsoleState("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const res = await callAPI(fileContent, mode, obfLevel);
      setResult(res);
      setConsoleState("result");
    } catch (err) {
      setErrorMsg(err.message || "Unknown error occurred");
      setConsoleState("error");
    }
  };

  const exportFile = () => {
    if (!result?.output_text) return;
    const prefix = mode === "DECODE" ? "decoded_" : "encoded_";
    const filename = prefix + (fileInfo?.name || "output.txt");
    const blob = new Blob([result.output_text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFileState("idle");
    setFileInfo(null);
    setFileContent("");
    setConsoleState("standby");
    setResult(null);
    setErrorMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-[#050505] font-mono text-white overflow-hidden relative flex flex-col">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl"
          style={{
            top: "10%",
            left: "20%",
            animation: "pulse-blob 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full bg-zinc-300/[0.015] blur-3xl"
          style={{
            bottom: "15%",
            right: "15%",
            animation: "pulse-blob 12s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full bg-white/[0.01] blur-2xl"
          style={{
            top: "50%",
            left: "60%",
            animation: "pulse-blob 6s ease-in-out infinite 2s",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <style>{`
        @keyframes pulse-blob {
          0%, 100% { transform: scale(1) translate(0,0); opacity: 0.5; }
          33% { transform: scale(1.15) translate(20px,-20px); opacity: 0.8; }
          66% { transform: scale(0.9) translate(-15px,15px); opacity: 0.4; }
        }
        @keyframes spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes pulse-glow { 0%,100%{opacity:0.6;transform:scale(1);} 50%{opacity:1;transform:scale(1.1);} }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(16px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes blink-cursor { 0%,100%{opacity:1;} 50%{opacity:0;} }
        .spin-cw { animation: spin-cw 2s linear infinite; }
        .spin-ccw { animation: spin-ccw 1.5s linear infinite; }
        .spin-cw-slow { animation: spin-cw 4s linear infinite; }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .fade-in-up { animation: fadeInUp 0.4s ease forwards; }
        .blink { animation: blink-cursor 1s step-end infinite; }
        .scanline-anim {
          animation: scanline 6s linear infinite;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent);
          height: 80px;
          position: absolute;
          width: 100%;
          pointer-events: none;
        }
      `}</style>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/60 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded border border-white/30 flex items-center justify-center bg-white/5">
              <Cpu size={16} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">
              KaiiDevID Systems v3.0
            </div>
            <div className="text-xs tracking-[0.2em] uppercase font-bold text-white">
              Absolute Decoder PROMAX
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-white/30 uppercase">
            <Activity size={12} className="text-white/50" />
            <span>sys.online</span>
          </div>
          <div className="text-[10px] tracking-widest text-white/20 uppercase hidden sm:block">
            neural.core.active
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* LEFT PANEL - Controls */}
        <div className="lg:w-5/12 relative border-r border-white/10 flex flex-col overflow-hidden">
          {/* Video background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-[0.04] pointer-events-none"
          >
            <source src="/video.mp4" type="video/mp4" />
          </video>

          {/* Scanline */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="scanline-anim" />
          </div>

          <div className="relative flex flex-col gap-4 p-5 h-full overflow-y-auto">
            {/* Section: Mode Switcher */}
            <div className="border border-white/10 rounded-lg bg-black/40 backdrop-blur-sm p-4 space-y-3">
              <div className="text-[9px] tracking-[0.4em] uppercase text-white/30 flex items-center gap-2">
                <div className="w-3 h-px bg-white/20" />
                operation mode
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("DECODE")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-md border text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
                    mode === "DECODE"
                      ? "bg-white text-black border-white font-bold"
                      : "border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 bg-transparent"
                  }`}
                >
                  <Unlock size={13} />
                  Decode
                </button>
                <button
                  onClick={() => setMode("ENCODE")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-md border text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
                    mode === "ENCODE"
                      ? "bg-white text-black border-white font-bold"
                      : "border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 bg-transparent"
                  }`}
                >
                  <Lock size={13} />
                  Encode
                </button>
              </div>

              {/* Obfuscation Level - only in ENCODE */}
              {mode === "ENCODE" && (
                <div className="space-y-2 pt-1 fade-in-up">
                  <div className="text-[9px] tracking-[0.35em] uppercase text-white/25">
                    obfuscation level
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setObfLevel("Rentan")}
                      className={`py-2.5 rounded border text-[10px] tracking-[0.15em] uppercase transition-all duration-200 ${
                        obfLevel === "Rentan"
                          ? "bg-zinc-200 text-black border-zinc-200 font-bold"
                          : "border-white/15 text-white/35 hover:border-white/30 hover:text-white/60"
                      }`}
                    >
                      Rentan
                    </button>
                    <button
                      onClick={() => setObfLevel("Strict")}
                      className={`py-2.5 rounded border text-[10px] tracking-[0.15em] uppercase transition-all duration-200 ${
                        obfLevel === "Strict"
                          ? "bg-white text-black border-white font-bold"
                          : "border-white/15 text-white/35 hover:border-white/30 hover:text-white/60"
                      }`}
                    >
                      ⚡ Strict
                    </button>
                  </div>
                  <div className="text-[9px] text-white/20 tracking-wide pt-1">
                    {obfLevel === "Strict"
                      ? "JSFuck / Heavy Multi-Layer Packing"
                      : "Basic Base64 / Hex — easily reversible"}
                  </div>
                </div>
              )}
            </div>

            {/* Section: File Upload */}
            <div className="border border-white/10 rounded-lg bg-black/40 backdrop-blur-sm p-4 space-y-3">
              <div className="text-[9px] tracking-[0.4em] uppercase text-white/30 flex items-center gap-2">
                <div className="w-3 h-px bg-white/20" />
                input source
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-md border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[120px] ${
                  isDragging
                    ? "border-white/60 bg-white/10"
                    : fileState === "ready"
                    ? "border-white/30 bg-white/5"
                    : "border-white/15 hover:border-white/30 hover:bg-white/3"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.js,.ts,.jsx,.tsx,.py,.html,.css,.json,.xml,.php,.rb,.java,.c,.cpp,.go,.rs,.sh,.md"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {fileState === "idle" && (
                  <div className="flex flex-col items-center gap-3 py-4 fade-in-up">
                    <Upload size={28} className="text-white/25" />
                    <div className="text-center">
                      <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">
                        Drop File Here
                      </div>
                      <div className="text-[9px] text-white/20 mt-1 tracking-wide">
                        or click to browse
                      </div>
                    </div>
                  </div>
                )}

                {fileState === "reading" && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 rounded-full border border-white/20 spin-cw" />
                      <div className="absolute inset-1 rounded-full border border-white/10 spin-ccw" />
                    </div>
                    <div className="text-[9px] tracking-[0.3em] uppercase text-white/30">
                      reading...
                    </div>
                  </div>
                )}

                {fileState === "ready" && fileInfo && (
                  <div className="flex flex-col items-center gap-2 py-4 fade-in-up">
                    <Database size={24} className="text-white/70" />
                    <div className="text-center px-2">
                      <div className="text-[10px] text-white/80 truncate max-w-[180px]">
                        {fileInfo.name}
                      </div>
                      <div className="text-[9px] text-white/30 mt-1 tracking-widest">
                        {formatSize(fileInfo.size)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {fileState === "ready" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="w-full py-1.5 border border-white/10 rounded text-[9px] tracking-[0.25em] uppercase text-white/30 hover:text-white/60 hover:border-white/20 transition-all"
                >
                  clear file
                </button>
              )}
            </div>

            {/* Section: Execute */}
            <div className="mt-auto">
              <button
                onClick={execute}
                disabled={fileState !== "ready" || consoleState === "loading"}
                className={`w-full py-4 rounded-lg border text-[11px] tracking-[0.35em] uppercase font-bold flex items-center justify-center gap-3 transition-all duration-300 ${
                  fileState === "ready" && consoleState !== "loading"
                    ? "bg-white text-black border-white hover:bg-zinc-100 active:scale-[0.98]"
                    : "bg-transparent border-white/10 text-white/20 cursor-not-allowed"
                }`}
              >
                {consoleState === "loading" ? (
                  <>
                    <div className="w-4 h-4 border border-black/30 border-t-black rounded-full spin-cw" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Execute {mode}
                    <ChevronRight size={14} />
                  </>
                )}
              </button>

              {/* Info row */}
              <div className="mt-3 flex items-center justify-between text-[9px] text-white/15 tracking-widest uppercase">
                <span>model: glm-4.5-air</span>
                <span>retry: 3x exp-backoff</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Console */}
        <div className="lg:w-7/12 relative flex flex-col overflow-hidden bg-black/20">
          {/* Console header */}
          <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between bg-black/30 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <Terminal size={13} className="text-white/40" />
              <span className="text-[9px] tracking-[0.4em] uppercase text-white/30">
                system console
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  consoleState === "loading"
                    ? "bg-white animate-pulse"
                    : consoleState === "result"
                    ? "bg-white"
                    : consoleState === "error"
                    ? "bg-white/50"
                    : "bg-white/20"
                }`}
              />
            </div>
            <div className="text-[9px] tracking-widest text-white/15 uppercase">
              {consoleState === "loading"
                ? "processing"
                : consoleState === "result"
                ? mode === "DECODE"
                  ? "decoded"
                  : "encoded"
                : consoleState === "error"
                ? "error"
                : "standby"}
              <span className="blink ml-0.5">_</span>
            </div>
          </div>

          {/* Console body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* STANDBY */}
            {consoleState === "standby" && (
              <div className="h-full flex flex-col items-center justify-center gap-6 fade-in-up min-h-[400px]">
                <div className="relative">
                  <div className="absolute inset-0 w-24 h-24 rounded-full border border-white/5 spin-cw-slow" />
                  <div className="absolute inset-3 rounded-full border border-white/8 spin-ccw" style={{ animationDuration: "6s" }} />
                  <ShieldAlert
                    size={40}
                    className="relative z-10 text-white/20 m-8 pulse-glow"
                  />
                </div>
                <div className="text-center space-y-2">
                  <div className="text-[11px] tracking-[0.5em] uppercase text-white/20">
                    System Standby
                  </div>
                  <div className="text-[9px] tracking-[0.3em] text-white/10 uppercase">
                    upload a file and execute to begin
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  {["●", "○", "○"].map((d, i) => (
                    <div key={i} className="text-white/20 text-xs">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LOADING */}
            {consoleState === "loading" && (
              <div className="h-full flex flex-col items-center justify-center gap-8 fade-in-up min-h-[400px]">
                {/* Complex spinner */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/10 spin-cw-slow" />
                  {/* Mid ring dashed */}
                  <div
                    className="absolute inset-2 rounded-full border-2 border-dashed border-white/20 spin-ccw"
                    style={{ animationDuration: "2s" }}
                  />
                  {/* Inner ring */}
                  <div
                    className="absolute inset-5 rounded-full border border-white/30 spin-cw"
                    style={{ animationDuration: "1s" }}
                  />
                  {/* Tick marks on outer ring */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <div
                      key={deg}
                      className="absolute w-1 h-1 rounded-full bg-white/40"
                      style={{
                        top: `${50 - 44 * Math.cos((deg * Math.PI) / 180)}%`,
                        left: `${50 + 44 * Math.sin((deg * Math.PI) / 180)}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  ))}
                  {/* Center logo */}
                  <div className="relative z-10 pulse-glow">
                    <Cpu size={22} className="text-white/80" />
                  </div>
                </div>

                {/* Loading text with index */}
                <div className="text-center space-y-3">
                  <div className="text-[11px] tracking-[0.4em] uppercase text-white/70">
                    {loadingText}
                  </div>
                  <div className="flex gap-1 justify-center">
                    {LOADING_TEXTS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-0.5 rounded-full transition-all duration-300 ${
                          i === loadingIdx
                            ? "w-6 bg-white"
                            : "w-1.5 bg-white/15"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-[9px] tracking-widest text-white/20 uppercase">
                    exponential backoff enabled · model: glm-4.5-air
                  </div>
                </div>
              </div>
            )}

            {/* ERROR */}
            {consoleState === "error" && (
              <div className="h-full flex flex-col items-center justify-center gap-5 fade-in-up min-h-[400px]">
                <div className="relative">
                  <XCircle size={48} className="text-white/50" />
                  <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-30" />
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <div className="text-[11px] tracking-[0.35em] uppercase text-white/60">
                    Execution Failed
                  </div>
                  <div className="text-[10px] text-white/30 font-mono break-all leading-relaxed border border-white/10 rounded p-3 bg-white/3">
                    {errorMsg}
                  </div>
                </div>
                <button
                  onClick={execute}
                  className="flex items-center gap-2 px-6 py-2.5 border border-white/30 rounded text-[10px] tracking-[0.3em] uppercase text-white/60 hover:text-white hover:border-white/60 transition-all"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            )}

            {/* RESULT */}
            {consoleState === "result" && result && (
              <div className="space-y-4 fade-in-up">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-white/70 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] tracking-[0.3em] uppercase text-white/70">
                        {result.success ? "Execution Successful" : "Partial Result"}
                      </div>
                      <div className="text-[9px] text-white/30 tracking-wide mt-0.5">
                        {mode === "DECODE" ? "Source decoded" : `Encoded — ${obfLevel}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={exportFile}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded text-[9px] tracking-[0.25em] uppercase font-bold hover:bg-zinc-100 active:scale-95 transition-all flex-shrink-0"
                  >
                    <Download size={11} />
                    Export File
                  </button>
                </div>

                {/* Method badges */}
                {result.methods_involved?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.methods_involved.map((m, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 border border-white/20 rounded text-[9px] tracking-[0.2em] uppercase text-white/50 bg-white/3"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {/* Thinking Steps */}
                {result.thinking_steps?.length > 0 && (
                  <div className="border border-white/10 rounded-lg bg-black/40 p-4 space-y-2">
                    <div className="text-[9px] tracking-[0.4em] uppercase text-white/25 flex items-center gap-2 mb-3">
                      <Activity size={10} />
                      Engine Execution Steps
                    </div>
                    {result.thinking_steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex gap-3 items-start text-[10px] text-white/50 leading-relaxed"
                      >
                        <span className="text-white/20 flex-shrink-0 font-bold">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1">{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Output text */}
                <div className="border border-white/10 rounded-lg bg-black/50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                    <div className="text-[9px] tracking-[0.4em] uppercase text-white/25">
                      {mode === "DECODE" ? "decoded output" : "encoded output"}
                    </div>
                    <div className="text-[9px] text-white/15">
                      {result.output_text?.length?.toLocaleString()} chars
                    </div>
                  </div>
                  <div className="relative">
                    <pre className="p-4 text-[10px] text-white/60 leading-relaxed overflow-x-auto max-h-[320px] overflow-y-auto whitespace-pre-wrap break-all">
                      {result.output_text}
                    </pre>
                  </div>
                </div>

                {/* Conclusion */}
                {result.conclusion && (
                  <div className="border border-white/10 rounded-lg bg-black/30 p-4">
                    <div className="text-[9px] tracking-[0.4em] uppercase text-white/25 mb-2 flex items-center gap-2">
                      <AlertTriangle size={10} />
                      Conclusion
                    </div>
                    <div className="text-[10px] text-white/45 leading-relaxed">
                      {result.conclusion}
                    </div>
                  </div>
                )}

                {/* Bottom export button */}
                <div className="pt-2">
                  <button
                    onClick={exportFile}
                    className="w-full py-3 border border-white/20 rounded-lg flex items-center justify-center gap-2 text-[10px] tracking-[0.3em] uppercase text-white/50 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all active:scale-[0.99]"
                  >
                    <Download size={13} />
                    Export as{" "}
                    {(mode === "DECODE" ? "decoded_" : "encoded_") +
                      (fileInfo?.name || "output.txt")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Console footer */}
          <div className="border-t border-white/5 px-5 py-2 flex items-center justify-between bg-black/20 backdrop-blur-sm flex-shrink-0">
            <div className="text-[8px] tracking-[0.35em] uppercase text-white/10">
              © kaiidevid · absolute decoder promax
            </div>
            <div className="text-[8px] tracking-[0.3em] uppercase text-white/10">
              openrouter · {MODEL}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}