import { useState, useEffect, useCallback } from "react";
import { Check, ChevronDown, Users, GitBranch, Loader2, AlertCircle, Zap, Target, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";

const PHASES = [
  {
    id: "p0",
    n: 0,
    title: "Setup & first inference",
    week: "Week 1",
    goal: "Get a working inference on one audio file — confirm the stack runs on your machine.",
    deliverables: [
      "conda env with PyTorch+torchaudio",
      "clovaai/aasist repo cloned",
      "pretrained AASIST-L weights loaded",
      "one file -> real/fake score in terminal",
    ],
    tasks: [
      "pip install torch torchaudio numpy soundfile",
      "git clone github.com/clovaai/aasist",
      "copy models/weights/AASIST-L.pth locally",
      "write 40-line infer.py wrapper",
      "test on 3 known real + 3 known fake files",
    ],
  },
  {
    id: "p1",
    n: 1,
    title: "Signal processing core",
    week: "Week 2-3",
    goal: "Build the shared preprocessing module — the golden-rule module used by both train and infer.",
    deliverables: [
      "preprocessing.py shared module",
      "handles any input format/rate/length",
      "CMVN stats file saved from training set",
      "unit tests: train vs infer output identical",
    ],
    tasks: [
      "decode: torchaudio.load() any format",
      "resample to 16kHz (polyphase resampler)",
      "mono downmix + amplitude normalize",
      "fix length: pad/crop to 64600 samples",
      "write test: same file -> same tensor both sides",
      "document every choice (rate, norm method)",
    ],
  },
  {
    id: "p2",
    n: 2,
    title: "Training pipeline",
    week: "Week 3-5",
    goal: "Train AASIST-L from scratch on ASVspoof 2019 LA — get your own weights, not borrowed ones.",
    deliverables: [
      "ASVspoof 2019 LA downloaded (~11GB)",
      "DataLoader for train/dev/eval splits",
      "train.py with LMCL loss + Adam",
      "best checkpoint saved (EER on dev set)",
      "training curve plot (loss vs epoch)",
    ],
    tasks: [
      "download dataset: asvspoof.org (Edinburgh DS)",
      "build dataset class + DataLoader",
      "RawBoost augment (convolutive+impulsive)",
      "copy AASIST-L model class from clovaai repo",
      "train loop: forward, loss, backprop, save best",
      "log EER on dev set each epoch",
      "pick best checkpoint by min dev EER",
    ],
  },
  {
    id: "p3",
    n: 3,
    title: "Evaluation & baseline EER",
    week: "Week 5-6",
    goal: "Report your first real EER numbers on ASVspoof 2019 LA eval set — the in-domain baseline.",
    deliverables: [
      "eval.py: score every file, compute EER",
      "min t-DCF (official metric) reported",
      "comparison table vs published AASIST-L EER",
      "score distribution plots (real vs fake)",
    ],
    tasks: [
      "run inference on full eval set",
      "compute EER using official scoring script",
      "compute min-tDCF (in clovaai repo)",
      "plot score histograms for both classes",
      "confirm your number vs paper (expect ~0.83%)",
      "flag any gap — investigate if >2x off",
    ],
  },
  {
    id: "p4",
    n: 4,
    title: "Cross-domain stress test",
    week: "Week 6-7",
    goal: "Quantify the generalization gap — test your 2019-trained model on ASVspoof 2021 DF (codec-degraded).",
    deliverables: [
      "ASVspoof 2021 DF eval scores",
      "EER comparison table: 2019 LA vs 2021 DF",
      "degradation number (the research finding)",
      "per-codec breakdown if possible",
    ],
    tasks: [
      "download ASVspoof 2021 DF eval partition",
      "run same frozen model on 2021 DF (no retraining)",
      "compute EER + tDCF on 2021 DF",
      "build comparison table (expect ~15% EER vs ~0.8%)",
      "test with Opus/AMR codec simulation too",
      "write findings section: THIS is your contribution",
    ],
  },
  {
    id: "p5",
    n: 5,
    title: "Calibration + abstain band",
    week: "Week 7-8",
    goal: "Add your research contribution: calibrate the raw score into a 3-band verdict with an honest abstain zone.",
    deliverables: [
      "Platt calibration fitted on dev-set scores",
      "3-band thresholds set at EER operating point",
      "abstain% reported: in-domain vs cross-domain",
      "result: how much error the abstain zone absorbs",
    ],
    tasks: [
      "collect raw scores on dev set",
      "fit LogisticRegression (Platt) on dev scores",
      "set two thresholds on calibrated probability",
      "run on 2019 eval: measure per-band distribution",
      "run on 2021 DF eval: measure per-band distribution",
      "report: X% of cross-domain errors -> abstain",
      "this comparison IS the paper-quality finding",
    ],
  },
  {
    id: "p6",
    n: 6,
    title: "Explainability + web UI",
    week: "Week 8-10",
    goal: "Make the system legible to a non-expert: Grad-CAM on the spectrogram + a simple upload-and-score web page.",
    deliverables: [
      "Grad-CAM overlay on spectrogram (PNG out)",
      "per-segment timeline plot",
      "FastAPI endpoint: POST audio -> JSON verdict",
      "simple web page: upload -> result card",
      "live mic demo (optional but impressive)",
    ],
    tasks: [
      "implement Grad-CAM on AASIST-L final layer",
      "generate spectrogram + overlay heatmap",
      "build per-window scorer + timeline plot",
      "wrap inference in FastAPI POST /analyze",
      "return JSON: band, prob, segments, heatmap_png",
      "build minimal React or plain HTML frontend",
      "test end-to-end: browser upload -> verdict",
    ],
  },
  {
    id: "p7",
    n: 7,
    title: "Codec robustness study",
    week: "Week 10-11",
    goal: "Measure how your detector degrades under real-world codecs and whether RawBoost augmentation closes the gap.",
    deliverables: [
      "codec simulation pipeline (Opus/AMR/MP3)",
      "EER vs bitrate table for 3+ codecs",
      "RawBoost vs no-RawBoost comparison",
      "conclusion: which codec kills detection most",
    ],
    tasks: [
      "re-encode eval files at 3 bitrates (Opus 8/16/32kbps)",
      "re-encode at AMR-NB 12.2kbps (phone quality)",
      "run scorer on each re-encoded set",
      "retrain with stationary noise RawBoost for DF",
      "compare EER: original vs codec-degraded vs augmented",
      "write findings: codec-robustness is the open problem",
    ],
  },
  {
    id: "p8",
    n: 8,
    title: "Professor review + write-up",
    week: "Week 11-12",
    goal: "Package everything into a defensible, presentable research deliverable.",
    deliverables: [
      "written report (intro, method, results, discussion)",
      "final architecture panel (already done)",
      "results tables: EER, tDCF, abstain%, codec",
      "live demo: one-command run on a new file",
      "wav2vec2 upper-bound reference (1 experiment)",
    ],
    tasks: [
      "write related work (4 papers + generalization lit)",
      "write method section from the architecture panel",
      "compile all result tables into one findings sheet",
      "record a short demo video (upload -> verdict)",
      "run wav2vec2+AASIST once: report vs AASIST-L",
      "prepare 5-min pitch: problem, system, finding",
    ],
  },
];

// ─── colour tokens by state ──────────────────────────────────────────────────
const STATE = {
  done: {
    label: "Done",
    badgeBg: "linear-gradient(135deg,#1D9E75,#16c98d)",
    badgeColor: "#fff",
    borderGradient: "linear-gradient(180deg,#1D9E75,#16c98d)",
    numBg: "#1D9E75",
    numColor: "#fff",
    barColor: "#1D9E75",
    cardShadow: "0 0 0 1px #d0f5e8, 0 4px 24px rgba(29,158,117,0.10)",
    headerBg: "linear-gradient(135deg,rgba(29,158,117,0.06),rgba(22,201,141,0.03))",
  },
  inProgress: {
    label: "In Progress",
    badgeBg: "linear-gradient(135deg,#f59e0b,#fbbf24)",
    badgeColor: "#fff",
    borderGradient: "linear-gradient(180deg,#f59e0b,#fbbf24)",
    numBg: "#fef3c7",
    numColor: "#92400e",
    barColor: "#f59e0b",
    cardShadow: "0 0 0 1px #fde68a, 0 4px 24px rgba(245,158,11,0.10)",
    headerBg: "linear-gradient(135deg,rgba(245,158,11,0.06),rgba(251,191,36,0.03))",
  },
  notStarted: {
    label: "Not Started",
    badgeBg: "#F1F0E9",
    badgeColor: "#9C9A8E",
    borderGradient: "linear-gradient(180deg,#D1CFC2,#E5E3D8)",
    numBg: "#EFEEE5",
    numColor: "#9C9A8E",
    barColor: "#C9C7B9",
    cardShadow: "0 0 0 1px #E5E3D8, 0 2px 8px rgba(0,0,0,0.04)",
    headerBg: "transparent",
  },
};

function getState(doneCount, total) {
  if (doneCount === total) return "done";
  if (doneCount > 0) return "inProgress";
  return "notStarted";
}

function taskId(phaseId, idx) {
  return `${phaseId}-t${idx}`;
}

function getTaskName(id) {
  const [pId, tIdxStr] = id.split("-t");
  const phase = PHASES.find((p) => p.id === pId);
  return phase ? phase.tasks[parseInt(tIdxStr, 10)] : "";
}

const INJECTED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }
  .ag-mono { font-family: 'JetBrains Mono', monospace; }
  @keyframes ag-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .ag-spin { animation: ag-spin 1s linear infinite; }
  @keyframes ag-fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .ag-panel-enter { animation: ag-fadeSlideIn 180ms ease both; }
  @keyframes ag-barFill { from { width: 0%; } }
  .ag-bar-fill { animation: ag-barFill 700ms cubic-bezier(.4,0,.2,1) both; }
  .ag-phase-card { background: #fff; border-radius: 14px; overflow: hidden; transition: box-shadow 200ms ease, transform 200ms ease; position: relative; }
  .ag-phase-card:hover { transform: translateY(-1px); }
  .ag-phase-btn { width: 100%; display: flex; align-items: center; gap: 14px; background: none; border: none; cursor: pointer; text-align: left; transition: background 150ms ease; font-family: inherit; position: relative; }
  .ag-task-row { display: flex; align-items: flex-start; gap: 12px; padding: 9px 6px; border-radius: 8px; transition: background 120ms ease; }
  .ag-task-row:hover { background: #F7F6F0; }
  .ag-check-btn { flex-shrink: 0; width: 20px; height: 20px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; transition: transform 120ms ease, background 120ms ease; margin-top: 1px; }
  .ag-check-btn:hover { transform: scale(1.12); }
  .ag-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; flex-shrink: 0; }
  .ag-chip { font-size: 12px; background: #F1F0E9; color: #5F5E5A; padding: 4px 10px; border-radius: 6px; transition: background 120ms; }
  .ag-chip:hover { background: #E5E3D8; }
  input[type=text]:focus { outline: 2px solid #1D9E75; outline-offset: 1px; }
  .ag-modal-backdrop { position: fixed; inset: 0; background: rgba(10,10,10,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; backdrop-filter: blur(4px); }
`;

export default function PhaseTracker() {
  const [completions, setCompletions] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [openPhase, setOpenPhase] = useState("p0");
  const [myName, setMyName] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [uncheckPendingId, setUncheckPendingId] = useState(null);
  const [uncheckConfirmText, setUncheckConfirmText] = useState("");
  const [uncheckName, setUncheckName] = useState("");
  const [uncheckReason, setUncheckReason] = useState("");

  // ── Load completions from Supabase on mount ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("completions")
          .select("id, completed_by, completed_at");
        if (err) throw err;
        const map = {};
        for (const row of data ?? []) {
          map[row.id] = { by: row.completed_by, at: row.completed_at };
        }
        setCompletions(map);
      } catch (e) {
        setError("Couldn't load completions — check Supabase config.");
        console.error(e);
      }
      try {
        const saved = localStorage.getItem("aasist-tracker-my-name");
        if (saved) setMyName(saved);
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("completions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "completions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new;
            setCompletions((prev) => ({
              ...prev,
              [row.id]: { by: row.completed_by, at: row.completed_at },
            }));
          } else if (payload.eventType === "DELETE") {
            const { id } = payload.old;
            setCompletions((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Toggle task ───────────────────────────────────────────────────────────
  const toggle = (id) => {
    if (completions[id]) {
      setUncheckPendingId(id);
      setUncheckConfirmText("");
      setUncheckName(myName || "");
      setUncheckReason("");
      return;
    }
    setPendingId(id);
    setDraftName(myName || "");
  };

  // ── Confirm completion ────────────────────────────────────────────────────
  const confirmComplete = useCallback(async () => {
    const name = draftName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    setCompletions((prev) => ({ ...prev, [pendingId]: { by: name, at: now } }));
    setPendingId(null);
    setDraftName("");
    if (name !== myName) {
      setMyName(name);
      try { localStorage.setItem("aasist-tracker-my-name", name); } catch (_) {}
    }
    const { error: err } = await supabase.from("completions").insert({
      id: pendingId, completed_by: name, completed_at: now, task_name: getTaskName(pendingId)
    });
    if (err) {
      setError("Couldn't save — check your connection and try again.");
      setCompletions((prev) => { const n = { ...prev }; delete n[pendingId]; return n; });
      console.error(err);
    } else setError(null);
  }, [draftName, myName, pendingId]);

  const cancelComplete = () => { setPendingId(null); setDraftName(""); };

  // ── Confirm Uncheck ───────────────────────────────────────────────────────
  const confirmUncheck = useCallback(async () => {
    if (uncheckConfirmText !== "UNCHECK") return;
    const id = uncheckPendingId;
    const originalAuthor = completions[id].by;
    const uncheckerName = uncheckName.trim();
    const isDifferentPerson = uncheckerName.toLowerCase() !== originalAuthor.toLowerCase();
    
    if (!uncheckerName) return;
    if (isDifferentPerson && !uncheckReason.trim()) return;
    
    if (uncheckerName !== myName) {
      setMyName(uncheckerName);
      try { localStorage.setItem("aasist-tracker-my-name", uncheckerName); } catch (_) {}
    }

    setCompletions((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setUncheckPendingId(null);
    setUncheckConfirmText("");
    setUncheckName("");
    setUncheckReason("");

    const { error: err } = await supabase.from("completions").delete().eq("id", id);
    if (err) {
      setError("Couldn't remove — check your connection.");
      console.error(err);
    } else {
      setError(null);
      if (isDifferentPerson) {
        supabase.from("discrepancies").insert({
          task_id: id,
          task_name: getTaskName(id),
          original_author: originalAuthor,
          unchecked_by: uncheckerName,
          reason: uncheckReason.trim(),
          unchecked_at: new Date().toISOString()
        }).then(({ error: logErr }) => {
          if (logErr) console.error("Failed to log discrepancy:", logErr);
        });
      }
    }
  }, [uncheckConfirmText, uncheckPendingId, uncheckName, uncheckReason, completions, myName]);

  const cancelUncheck = () => { setUncheckPendingId(null); setUncheckConfirmText(""); setUncheckName(""); setUncheckReason(""); };

  const totalTasks = PHASES.reduce((sum, p) => sum + p.tasks.length, 0);
  const totalDone  = Object.keys(completions).length;
  const overallPct = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const phasesActive   = PHASES.filter((p) => {
    const d = p.tasks.filter((_, i) => completions[taskId(p.id, i)]).length;
    return d > 0 && d < p.tasks.length;
  }).length;
  const phasesDone = PHASES.filter((p) =>
    p.tasks.every((_, i) => completions[taskId(p.id, i)])
  ).length;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <>
        <style>{INJECTED_CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "'Space Grotesk', Inter, sans-serif", color: "#9C9A8E", gap: 12 }}>
          <Loader2 size={28} className="ag-spin" style={{ color: "#1D9E75" }} />
          <span style={{ fontSize: 14 }}>Loading tracker…</span>
        </div>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{INJECTED_CSS}</style>

      <div style={{ fontFamily: "'Space Grotesk', Inter, sans-serif", background: "#F8F7F2", minHeight: "100vh", color: "#26211C", width: "100%" }}>

        {/* ── Sticky top nav ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #E5E3D8", padding: "0 1.25rem", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1D9E75,#16c98d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={14} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>AASIST Phase Tracker</span>
            </div>
            <span className="ag-mono" style={{ fontSize: 12, color: "#B0AEA4" }}>Audio Deepfake Detection</span>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem 5rem" }}>

          {/* ── Hero ── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Phase execution tracker
            </h1>
            <p style={{ color: "#6B6862", fontSize: 14, margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
              Nine phases, zero-to-product-grade. Check a task off once its GitHub issue is merged — recorded permanently and shared with your team.
            </p>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", color: "#991B1B", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 20, border: "1px solid #FECACA" }}>
              <AlertCircle size={15} strokeWidth={2.5} /> {error}
            </div>
          )}

          {/* ── Stats + progress card ── */}
          <div style={{ background: "#fff", border: "1px solid #E5E3D8", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.75rem", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <StatBadge icon={<Target size={13} />} label="Tasks done"    value={`${totalDone}/${totalTasks}`} color="#1D9E75" />
            <StatBadge icon={<Clock size={13} />}  label="In progress"   value={phasesActive}                 color="#f59e0b" />
            <StatBadge icon={<Check size={13} />}  label="Phases done"   value={phasesDone}                   color="#1D9E75" />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12, color: "#9C9A8E" }}>
                <span>Overall progress</span>
                <span className="ag-mono" style={{ color: "#1D9E75", fontWeight: 600 }}>{overallPct}%</span>
              </div>
              <div style={{ height: 10, background: "#EFEEE5", borderRadius: 999, overflow: "hidden" }}>
                <div
                  className="ag-bar-fill"
                  style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,#1D9E75,#16c98d)", borderRadius: 999 }}
                />
              </div>
            </div>
          </div>

          {/* ── Phase cards ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PHASES.map((phase) => {
              const doneCount = phase.tasks.filter((_, i) => completions[taskId(phase.id, i)]).length;
              const pct       = Math.round((doneCount / phase.tasks.length) * 100);
              const isOpen    = openPhase === phase.id;
              const stateKey  = getState(doneCount, phase.tasks.length);
              const S         = STATE[stateKey];

              return (
                <div key={phase.id} className="ag-phase-card" style={{ boxShadow: S.cardShadow }}>

                  {/* Gradient left-border accent */}
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: S.borderGradient, borderRadius: "14px 0 0 14px" }} />

                  {/* Header button */}
                  <button
                    className="ag-phase-btn"
                    onClick={() => setOpenPhase(isOpen ? null : phase.id)}
                    style={{ background: isOpen ? S.headerBg : "transparent", padding: "1rem 1.1rem 1rem 1.4rem" }}
                  >
                    {/* Number / check badge */}
                    <div className="ag-mono" style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0, background: S.numBg, color: S.numColor, transition: "background 300ms, color 300ms" }}>
                      {stateKey === "done" ? <Check size={16} strokeWidth={3} /> : phase.n}
                    </div>

                    {/* Title + mini bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{phase.title}</span>
                        <span className="ag-mono" style={{ fontSize: 11, color: "#B0AEA4" }}>{phase.week}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                        <div style={{ width: 100, height: 5, background: "#EFEEE5", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: S.barColor, borderRadius: 999, transition: "width 400ms ease" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#9C9A8E" }}>{doneCount}/{phase.tasks.length}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="ag-badge" style={{ background: S.badgeBg, color: S.badgeColor }}>
                      {stateKey === "done" && <Check size={10} strokeWidth={3} />}
                      {S.label}
                    </div>

                    <ChevronDown size={18} color="#B0AEA4" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 220ms ease", flexShrink: 0 }} />
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="ag-panel-enter" style={{ borderTop: "1px solid #F0EFE8", padding: "1.1rem 1.4rem 1.4rem" }}>

                      <p style={{ fontSize: 13.5, color: "#5F5E5A", margin: "0 0 1.1rem", lineHeight: 1.6 }}>{phase.goal}</p>

                      {/* Deliverables */}
                      <div style={{ marginBottom: "1.1rem" }}>
                        <div className="ag-mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0AEA4", marginBottom: 8 }}>Deliverables</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {phase.deliverables.map((d, i) => (
                            <span key={i} className="ag-chip">{d}</span>
                          ))}
                        </div>
                      </div>

                      {/* Tasks */}
                      <div>
                        <div className="ag-mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B0AEA4", marginBottom: 6 }}>
                          Tasks — one per GitHub issue
                        </div>
                        {phase.tasks.map((task, i) => {
                          const id   = taskId(phase.id, i);
                          const done = completions[id];
                          return (
                            <div key={id} className="ag-task-row">
                              <button
                                className="ag-check-btn"
                                onClick={() => toggle(id)}
                                aria-label={done ? "Mark incomplete" : "Mark complete"}
                                style={{ border: done ? "none" : "1.5px solid #C9C7B9", background: done ? S.barColor : "transparent" }}
                              >
                                {done && <Check size={12} color="#fff" strokeWidth={3} />}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, color: done ? "#B0AEA4" : "#26211C", textDecoration: done ? "line-through" : "none", lineHeight: 1.45 }}>
                                  {task}
                                </div>
                                {done && (
                                  <div className="ag-mono" style={{ fontSize: 11, color: S.barColor, marginTop: 2 }}>
                                    ✓ done by {done.by} · {fmtDate(done.at)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Footer ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "2rem", fontSize: 12, color: "#B0AEA4" }}>
            <GitBranch size={13} />
            One checkbox per GitHub issue. Check it off once your branch is merged.
          </div>
        </div>
      </div>

      {/* ── Attribution modal ── */}
      {pendingId && (
        <div className="ag-modal-backdrop" onClick={cancelComplete}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", width: 340, boxShadow: "0 24px 48px rgba(0,0,0,0.20), 0 0 0 1px rgba(0,0,0,0.06)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#1D9E75,#16c98d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={14} color="#fff" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Who completed this?</span>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Your name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmComplete()}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E3D8", fontSize: 14, fontFamily: "inherit", color: "#26211C" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button
                onClick={cancelComplete}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E3D8", background: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#5F5E5A" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmComplete}
                disabled={!draftName.trim()}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: draftName.trim() ? "linear-gradient(135deg,#1D9E75,#16c98d)" : "#C9C7B9", color: "#fff", fontSize: 13, cursor: draftName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 600 }}
              >
                Mark done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── High-friction Uncheck modal ── */}
      {uncheckPendingId && completions[uncheckPendingId] && (() => {
        const originalAuthor = completions[uncheckPendingId].by;
        const isDifferentPerson = uncheckName.trim().toLowerCase() !== originalAuthor.toLowerCase();
        const canSubmit = uncheckConfirmText === "UNCHECK" && uncheckName.trim() && (!isDifferentPerson || uncheckReason.trim().length > 2);

        return (
        <div className="ag-modal-backdrop" onClick={cancelUncheck}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", width: 360, boxShadow: "0 24px 48px rgba(0,0,0,0.20), 0 0 0 1px rgba(0,0,0,0.06)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={14} color="#991B1B" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 15, color: "#991B1B" }}>Danger: Uncheck task?</span>
            </div>
            
            <p style={{ fontSize: 13, color: "#5F5E5A", marginBottom: 16, lineHeight: 1.5 }}>
              This task was originally marked done by <strong>{originalAuthor}</strong>. 
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 4 }}>Your Name</label>
              <input
                type="text"
                autoFocus
                placeholder="Who is unchecking this?"
                value={uncheckName}
                onChange={(e) => setUncheckName(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E3D8", fontSize: 14, fontFamily: "inherit", color: "#26211C" }}
              />
            </div>

            {isDifferentPerson && (
              <div style={{ marginBottom: 12 }} className="ag-panel-enter">
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 4 }}>Technical Discrepancy (Reason)</label>
                <textarea
                  placeholder="What was the discrepancy or reason for unchecking?"
                  value={uncheckReason}
                  onChange={(e) => setUncheckReason(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E3D8", fontSize: 14, fontFamily: "inherit", color: "#26211C", minHeight: 60, resize: "vertical" }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#991B1B", marginBottom: 4 }}>Type UNCHECK to confirm</label>
              <input
                type="text"
                placeholder="UNCHECK"
                value={uncheckConfirmText}
                onChange={(e) => setUncheckConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && confirmUncheck()}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #FECACA", fontSize: 14, fontFamily: "inherit", color: "#991B1B" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={cancelUncheck}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E3D8", background: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#5F5E5A" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUncheck}
                disabled={!canSubmit}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: canSubmit ? "#DC2626" : "#FCA5A5", color: "#fff", fontSize: 13, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 600 }}
              >
                Force Uncheck
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </>
  );
}

// ── Stat badge widget ─────────────────────────────────────────────────────────
function StatBadge({ icon, label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9C9A8E" }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="ag-mono" style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}


