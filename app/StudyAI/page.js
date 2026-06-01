"use client";

import { useState, useRef, useEffect } from "react";
import { loadDocument, loadFromPaste } from "./DocumentLoader";
import { splitDocuments } from "./TextSplitter";
import { buildRetriever } from "./Retriever";
import { askQuestion, quickAction, clearHistory } from "./qachain";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-primary:   #0a0a0f;
    --bg-card:      #111118;
    --bg-surface:   #1a1a2e;
    --bg-input:     #16161f;
    --accent-blue:  #3b82f6;
    --accent-purple:#8b5cf6;
    --accent-pink:  #ec4899;
    --border:       rgba(255,255,255,0.07);
    --border-glow:  rgba(139,92,246,0.35);
    --text-primary: #f1f5f9;
    --text-muted:   #64748b;
    --text-subtle:  #94a3b8;
    --font-main:    'Plus Jakarta Sans', sans-serif;
    --font-mono:    'JetBrains Mono', monospace;
    --radius-sm:    8px;
    --radius-md:    14px;
    --radius-lg:    20px;
    --radius-pill:  999px;
  }

  /* ── Layout ── */
  .page-wrapper {
    display: flex; flex-direction: column; height: 100vh;
    background: var(--bg-primary); overflow: hidden;
  }

  /* ── Main layout ── */
  .main {
    display: grid; grid-template-columns: 280px 1fr;
    flex: 1; overflow: hidden;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--bg-card); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .sidebar-header {
    padding: 20px 18px 14px;
    border-bottom: 1px solid var(--border);
  }
  .sidebar-title { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 14px; }

  /* upload zone */
  .upload-zone {
    border: 1.5px dashed rgba(139,92,246,0.35);
    border-radius: var(--radius-md);
    padding: 22px 14px; text-align: center; cursor: pointer;
    background: rgba(139,92,246,0.04);
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: rgba(139,92,246,0.6);
    background: rgba(139,92,246,0.08);
  }
  .upload-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .upload-icon { font-size: 26px; margin-bottom: 8px; }
  .upload-label { font-size: 12.5px; font-weight: 600; color: var(--text-subtle); }
  .upload-sub   { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

  /* paste tab */
  .input-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
  .input-tab {
    flex: 1; padding: 6px; border-radius: var(--radius-sm); font-size: 12px;
    font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid var(--border);
    color: var(--text-muted); background: transparent;
  }
  .input-tab.active { background: rgba(139,92,246,0.15); color: #c4b5fd; border-color: rgba(139,92,246,0.3); }

  .paste-area {
    width: 100%; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-input); color: var(--text-primary); font-family: var(--font-main);
    font-size: 12px; padding: 10px 12px; resize: none; outline: none;
    transition: border-color 0.2s;
  }
  .paste-area:focus { border-color: rgba(139,92,246,0.4); }
  .paste-area::placeholder { color: var(--text-muted); }

  .process-btn {
    width: 100%; margin-top: 10px; padding: 11px;
    border-radius: var(--radius-sm); border: none; cursor: pointer;
    font-size: 13px; font-weight: 700; letter-spacing: 0.2px;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    color: #fff; transition: opacity 0.2s;
  }
  .process-btn:hover:not(:disabled) { opacity: 0.88; }
  .process-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* progress */
  .progress-wrap { padding: 12px 18px; border-bottom: 1px solid var(--border); }
  .progress-label { font-size: 11.5px; color: var(--text-subtle); margin-bottom: 6px; display: flex; justify-content: space-between; }
  .progress-bar { height: 4px; border-radius: var(--radius-pill); background: rgba(255,255,255,0.07); overflow: hidden; }
  .progress-fill { height: 100%; border-radius: var(--radius-pill); background: linear-gradient(90deg, #7c3aed, #ec4899); transition: width 0.4s ease; }

  /* doc info */
  .doc-info { padding: 14px 18px; border-bottom: 1px solid var(--border); }
  .doc-badge {
    display: flex; align-items: center; gap: 10px;
    background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2);
    border-radius: var(--radius-sm); padding: 10px 12px;
  }
  .doc-badge-icon { font-size: 20px; }
  .doc-badge-name { font-size: 12.5px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
  .doc-badge-meta { font-size: 10.5px; color: var(--text-muted); margin-top: 1px; }
  .doc-badge-remove { margin-left: auto; font-size: 14px; cursor: pointer; color: var(--text-muted); opacity: 0.6; }
  .doc-badge-remove:hover { opacity: 1; color: #f87171; }

  /* quick actions */
  .quick-actions { padding: 14px 18px; border-bottom: 1px solid var(--border); }
  .qa-title { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
  .qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  .qa-btn {
    padding: 9px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-input); cursor: pointer; transition: all 0.2s;
    text-align: center; font-size: 11.5px; font-weight: 600; color: var(--text-subtle);
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .qa-btn:hover:not(:disabled) {
    border-color: rgba(139,92,246,0.4); color: #c4b5fd;
    background: rgba(139,92,246,0.08);
  }
  .qa-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .qa-btn-icon { font-size: 16px; }

  /* chunk profile */
  .profile-wrap { padding: 12px 18px; }
  .profile-label { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 8px; }
  .profile-select {
    width: 100%; padding: 8px 10px; border-radius: var(--radius-sm);
    border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary);
    font-size: 12.5px; font-family: var(--font-main); outline: none; cursor: pointer;
  }
  .profile-select:focus { border-color: rgba(139,92,246,0.4); }

  /* ── Chat area ── */
  .chat-area {
    display: flex; flex-direction: column; overflow: hidden;
    background: var(--bg-primary); position: relative;
  }

  .chat-glow {
    position: absolute; top: -120px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 400px; border-radius: 50%;
    background: radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .chat-header {
    padding: 16px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    position: relative; z-index: 1;
  }
  .chat-header-left { display: flex; align-items: center; gap: 12px; }
  .chat-header-dot { width: 9px; height: 9px; border-radius: 50%; }
  .chat-header-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
  .chat-header-sub   { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
  .clear-btn {
    padding: 7px 14px; border-radius: var(--radius-pill); border: 1px solid var(--border);
    background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
  }
  .clear-btn:hover { border-color: rgba(248,113,113,0.4); color: #fca5a5; }

  /* messages */
  .messages {
    flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column;
    gap: 18px; position: relative; z-index: 1;
  }
  .messages::-webkit-scrollbar { width: 4px; }
  .messages::-webkit-scrollbar-track { background: transparent; }
  .messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  /* empty state */
  .empty-state {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 16px; padding: 40px;
  }
  .empty-icon {
    width: 72px; height: 72px; border-radius: 22px;
    background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.15));
    border: 1px solid rgba(139,92,246,0.2);
    display: flex; align-items: center; justify-content: center; font-size: 32px;
  }
  .empty-title { font-size: 20px; font-weight: 800; background: linear-gradient(135deg, #c4b5fd, #f9a8d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .empty-sub   { font-size: 13.5px; color: var(--text-muted); text-align: center; max-width: 380px; line-height: 1.6; }
  .empty-hints { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 6px; }
  .empty-hint {
    padding: 7px 14px; border-radius: var(--radius-pill); border: 1px solid var(--border);
    background: var(--bg-card); font-size: 12px; color: var(--text-subtle); cursor: pointer;
    transition: all 0.2s;
  }
  .empty-hint:hover { border-color: rgba(139,92,246,0.4); color: #c4b5fd; background: rgba(139,92,246,0.06); }

  /* message bubbles */
  .msg { display: flex; gap: 12px; align-items: flex-start; animation: msgIn 0.25s ease; }
  @keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .msg.user { flex-direction: row-reverse; }

  .msg-avatar {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 15px;
  }
  .msg-avatar.ai   { background: linear-gradient(135deg, #7c3aed, #ec4899); }
  .msg-avatar.user { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }

  .msg-bubble {
    max-width: 72%; padding: 13px 16px; border-radius: var(--radius-md);
    font-size: 13.5px; line-height: 1.65; border: 1px solid var(--border);
  }
  .msg.user .msg-bubble {
    background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(29,78,216,0.1));
    border-color: rgba(59,130,246,0.2); border-radius: var(--radius-md) 4px var(--radius-md) var(--radius-md);
  }
  .msg.ai .msg-bubble {
    background: var(--bg-card);
    border-radius: 4px var(--radius-md) var(--radius-md) var(--radius-md);
  }
  .msg-time { font-size: 10.5px; color: var(--text-muted); margin-top: 6px; }

  /* source pills */
  .source-pills { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
  .source-pill {
    padding: 3px 9px; border-radius: var(--radius-pill);
    background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2);
    font-size: 10.5px; color: #c4b5fd; font-family: var(--font-mono);
  }

  /* typing indicator */
  .typing { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
  .typing-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-purple); animation: bounce 1.2s infinite; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-5px); opacity: 1; } }

  /* action result card */
  .action-card {
    background: var(--bg-card); border: 1px solid rgba(139,92,246,0.2);
    border-radius: var(--radius-md); padding: 18px 20px;
    position: relative; overflow: hidden;
  }
  .action-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #7c3aed, #ec4899);
  }
  .action-card-label { font-size: 10.5px; font-weight: 700; color: var(--accent-purple); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
  .action-card-content { font-size: 13.5px; line-height: 1.7; color: var(--text-subtle); white-space: pre-wrap; }

  /* ── Input bar ── */
  .input-bar {
    padding: 16px 24px; border-top: 1px solid var(--border);
    background: rgba(10,10,15,0.8); backdrop-filter: blur(12px);
    flex-shrink: 0; position: relative; z-index: 1;
  }
  .input-wrap {
    display: flex; gap: 10px; align-items: flex-end;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 10px 14px;
    transition: border-color 0.2s;
  }
  .input-wrap:focus-within { border-color: rgba(139,92,246,0.4); }
  .chat-input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text-primary); font-family: var(--font-main); font-size: 14px;
    resize: none; max-height: 120px; line-height: 1.5;
  }
  .chat-input::placeholder { color: var(--text-muted); }
  .send-btn {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 15px; transition: opacity 0.2s; align-self: flex-end;
  }
  .send-btn:hover:not(:disabled) { opacity: 0.85; }
  .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .input-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; text-align: center; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const QUICK_ACTIONS = [
  { key: "summarise",  label: "Summarise",  icon: "📝" },
  { key: "keypoints",  label: "Key Points", icon: "🎯" },
  { key: "flashcards", label: "Flashcards", icon: "🃏" },
  { key: "simplify",   label: "Simplify",   icon: "💡" },
];

const HINT_PROMPTS = [
  "What are the main concepts?",
  "Explain this in simple terms",
  "What are the key formulas?",
  "Give me a quick summary",
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StudyAIPage() {
  const [activeTab,    setActiveTab]    = useState("upload");
  const [profile,      setProfile]      = useState("academic");
  const [document,     setDocument]     = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnswering,  setIsAnswering]  = useState(false);
  const [progress,     setProgress]     = useState({ stage: "", percent: 0 });
  const [pasteText,    setPasteText]    = useState("");
  const [dragOver,     setDragOver]     = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const textareaRef    = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnswering]);

  async function processPipeline(file, pastedText) {
    setIsProcessing(true);
    setProgress({ stage: "Starting…", percent: 0 });

    const docs = file
      ? await loadDocument(file, ({ stage, percent }) => setProgress({ stage, percent }))
      : loadFromPaste(pastedText);

    setProgress({ stage: "Splitting into chunks…", percent: 60 });
    const chunks = await splitDocuments(docs, profile);

    setProgress({ stage: "Building vector store…", percent: 75 });
    const sessionId = await buildRetriever(
  chunks,
  ({ stage, percent }) => setProgress({ stage, percent })
);

setSessionId(sessionId);

    setProgress({ stage: "Ready ✓", percent: 100 });

    const docName = file ? file.name : "Pasted Content";
    const docType = file
      ? (file.name.endsWith(".pdf") ? "pdf-text" : "plain-text")
      : "plain-text";

    setDocument({ name: docName, type: docType, chunks: chunks.length });
    setIsProcessing(false);

    setMessages([{
      id:      Date.now(),
      role:    "ai",
      text:    `Document loaded! Processed **${docName}** into ${chunks.length} chunks. Ask me anything about it, or use the quick actions.`,
      time:    timestamp(),
      sources: [],
    }]);
  }

  async function handleFileUpload(file) {
    if (!file) return;
    await processPipeline(file, null);
  }

  async function handlePasteProcess() {
    if (!pasteText.trim()) return;
    await processPipeline(null, pasteText);
  }

  async function handleSend(text) {
    const q = (text || input).trim();
    if (!q || !sessionId || isAnswering) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { id: Date.now(), role: "user", text: q, time: timestamp() };
    setMessages(prev => [...prev, userMsg]);
    setIsAnswering(true);

    const answer = await askQuestion(q, sessionId);
    const aiMsg = {
      id:      Date.now() + 1,
      role:    "ai",
      text:    answer,
      time:    timestamp(),
      sources: [],
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsAnswering(false);
  }

  async function handleQuickAction(action) {
    if (!sessionId || isAnswering) return;
    setIsAnswering(true);

    const label = QUICK_ACTIONS.find(a => a.key === action)?.label;

    const userMsg = {
      id:   Date.now(),
      role: "user",
      text: `Generate ${label} for this document`,
      time: timestamp(),
    };
    setMessages(prev => [...prev, userMsg]);

    const result = await quickAction(action, sessionId);

    const aiMsg = {
      id:          Date.now() + 1,
      role:        "ai",
      isAction:    true,
      actionKey:   action,
      actionLabel: label,
      text:        result,
      time:        timestamp(),
      sources:     [],
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsAnswering(false);
  }

  function handleClear() {
    setMessages([]);
    clearHistory();
  }

  function handleRemoveDoc() {
    setDocument(null);
    setSessionId(null);
    setMessages([]);
    setProgress({ stage: "", percent: 0 });
    setPasteText("");
  }

  const canInteract = !!sessionId && !isProcessing;

  return (
    <>
      <style>{CSS}</style>
      <div className="page-wrapper">

        {/* ── Main ── */}
        <div className="main">

          {/* ── Sidebar ── */}
          <aside className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-title">Document Input</div>

              <div className="input-tabs">
                <button
                  className={`input-tab${activeTab === "upload" ? " active" : ""}`}
                  onClick={() => setActiveTab("upload")}>
                  ↑ Upload
                </button>
                <button
                  className={`input-tab${activeTab === "paste" ? " active" : ""}`}
                  onClick={() => setActiveTab("paste")}>
                  ✎ Paste
                </button>
              </div>

              {activeTab === "upload" && !document && (
                <div
                  className={`upload-zone${dragOver ? " drag-over" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files[0]); }}>
                  <input
                    type="file" accept=".pdf,.txt,.md" ref={fileInputRef}
                    onChange={e => handleFileUpload(e.target.files[0])} />
                  <div className="upload-icon">📄</div>
                  <div className="upload-label">Drop your file here</div>
                  <div className="upload-sub">PDF, TXT, MD — max 20 MB</div>
                </div>
              )}

              {activeTab === "paste" && !document && (
                <>
                  <textarea
                    className="paste-area" rows={6}
                    placeholder="Paste your notes, articles, or any study material here…"
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)} />
                  <button
                    className="process-btn"
                    disabled={!pasteText.trim() || isProcessing}
                    onClick={handlePasteProcess}>
                    {isProcessing ? "Processing…" : "Process Content →"}
                  </button>
                </>
              )}
            </div>

            {isProcessing && (
              <div className="progress-wrap">
                <div className="progress-label">
                  <span>{progress.stage}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
            )}

            {document && (
              <div className="doc-info">
                <div className="doc-badge">
                  <div className="doc-badge-icon">
                    {document.type === "pdf-scanned" ? "🖨️" : document.type === "pdf-text" ? "📕" : "📝"}
                  </div>
                  <div>
                    <div className="doc-badge-name">{document.name}</div>
                    <div className="doc-badge-meta">{document.chunks} chunks · {document.type}</div>
                  </div>
                  <div className="doc-badge-remove" onClick={handleRemoveDoc} title="Remove document">✕</div>
                </div>
              </div>
            )}

            <div className="quick-actions">
              <div className="qa-title">Quick Actions</div>
              <div className="qa-grid">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.key}
                    className="qa-btn"
                    disabled={!canInteract || isAnswering}
                    onClick={() => handleQuickAction(a.key)}>
                    <span className="qa-btn-icon">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-wrap">
              <div className="profile-label">Chunk Profile</div>
              <select
                className="profile-select"
                value={profile}
                onChange={e => setProfile(e.target.value)}>
                <option value="academic">Academic — Dense PDFs</option>
                <option value="notes">Notes — Lecture / Articles</option>
                <option value="brief">Brief — Short Passages</option>
              </select>
            </div>
          </aside>

          {/* ── Chat area ── */}
          <div className="chat-area">
            <div className="chat-glow" />

            <div className="chat-header">
              <div className="chat-header-left">
                <div
                  className="chat-header-dot"
                  style={{
                    background: canInteract ? "#22c55e" : "#64748b",
                    boxShadow: canInteract ? "0 0 8px #22c55e" : "none",
                  }}
                />
                <div>
                  <div className="chat-header-title">Study Assistant</div>
                  <div className="chat-header-sub">
                    {canInteract
                      ? `${document?.name} — ${document?.chunks} chunks indexed`
                      : "Upload a document to start chatting"}
                  </div>
                </div>
              </div>
              {messages.length > 0 && (
                <button className="clear-btn" onClick={handleClear}>Clear chat</button>
              )}
            </div>

            <div className="messages">
              {messages.length === 0 && !isProcessing ? (
                <div className="empty-state">
                  <div className="empty-icon">🧠</div>
                  <div className="empty-title">Ask me anything</div>
                  <div className="empty-sub">
                    Upload your study material and I&apos;ll answer questions, generate summaries, create flashcards, and help you understand complex topics.
                  </div>
                  <div className="empty-hints">
                    {HINT_PROMPTS.map(h => (
                      <button key={h} className="empty-hint" onClick={() => { if (canInteract) handleSend(h); }}>
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`msg ${msg.role}`}>
                    <div className={`msg-avatar ${msg.role}`}>
                      {msg.role === "ai" ? "✦" : "👤"}
                    </div>
                    <div>
                      {msg.isAction ? (
                        <div className="action-card">
                          <div className="action-card-label">{msg.actionLabel}</div>
                          <div className="action-card-content">{msg.text}</div>
                        </div>
                      ) : (
                        <div className="msg-bubble">{msg.text}</div>
                      )}
                      {msg.sources?.length > 0 && (
                        <div className="source-pills">
                          {msg.sources.map((s, i) => (
                            <span key={i} className="source-pill">pg {s.page} · chunk {s.chunk}</span>
                          ))}
                        </div>
                      )}
                      <div className="msg-time">{msg.time}</div>
                    </div>
                  </div>
                ))
              )}

              {isAnswering && (
                <div className="msg ai">
                  <div className="msg-avatar ai">✦</div>
                  <div className="msg-bubble">
                    <div className="typing">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="input-bar">
              <div className="input-wrap">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  rows={1}
                  placeholder={canInteract ? "Ask a question about your document…" : "Upload a document first…"}
                  value={input}
                  disabled={!canInteract || isAnswering}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                />
                <button
                  className="send-btn"
                  disabled={!canInteract || !input.trim() || isAnswering}
                  onClick={() => handleSend()}>
                  ➤
                </button>
              </div>
              <div className="input-hint">Enter to send · Shift+Enter for new line · Powered by Groq llama-3.3-70b</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}