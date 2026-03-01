"use client";

import { useEffect, useMemo, useState } from "react";

const phases = {
  1: "Conditional Thinking",
  2: "Looping & Patterns",
  3: "Recursion",
  4: "Basic Arrays",
  5: "Strings",
  6: "Mixed Logical Challenges"
};

const statusOrder = {
  Pending: 1,
  Completed: 2,
  Easy: 3,
  Hard: 4,
  Today: 5
};

function parseId(id) {
  const match = id.match(/P(\d+)-L(\d+)-Q(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export default function DashboardClient() {
  const [questions, setQuestions] = useState([]);
  const [strikeIds, setStrikeIds] = useState([]);
  const [heatmap, setHeatmap] = useState({});
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filters, setFilters] = useState({
    phase: "",
    level: "",
    status: "",
    search: "",
    sort: "id-asc"
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", phase: "1", level: "1" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lmt_theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark", isDark);
    setMounted(true);
  }, []);

  useEffect(() => {
    const cachedQuestions = localStorage.getItem("lmt_cache_questions");
    const cachedStrike = localStorage.getItem("lmt_cache_strike");
    const cachedHeatmap = localStorage.getItem("lmt_cache_heatmap");
    const cachedMe = localStorage.getItem("lmt_cache_me");
    if (cachedQuestions) {
      setQuestions(JSON.parse(cachedQuestions));
    }
    if (cachedStrike) {
      setStrikeIds(JSON.parse(cachedStrike));
    }
    if (cachedHeatmap) {
      setHeatmap(JSON.parse(cachedHeatmap));
    }
    if (cachedMe) {
      setMe(JSON.parse(cachedMe));
    }
    fetchAll({ silent: !!cachedQuestions });
  }, []);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  async function fetchAll({ silent } = {}) {
    if (!silent) setLoading(true);
    const [qRes, sRes] = await Promise.all([
      fetch("/api/questions"),
      fetch("/api/strike")
    ]);
    if (qRes.ok) {
      const qData = await qRes.json();
      setQuestions(qData.questions || []);
      localStorage.setItem("lmt_cache_questions", JSON.stringify(qData.questions || []));
    }
    if (sRes.ok) {
      const sData = await sRes.json();
      setStrikeIds(sData.ids || []);
      localStorage.setItem("lmt_cache_strike", JSON.stringify(sData.ids || []));
      const map = {};
      (sData.heatmap || []).forEach((row) => {
        map[row.day] = row.count;
      });
      setHeatmap(map);
      localStorage.setItem("lmt_cache_heatmap", JSON.stringify(map));
    }
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      const mRes = await fetch("/api/me");
      if (mRes.ok) {
        const mData = await mRes.json();
        setMe(mData.user || null);
        localStorage.setItem("lmt_cache_me", JSON.stringify(mData.user || null));
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function openModal(q) {
    setError("");
    if (q) {
      setEditing(q);
      setForm({ title: q.title, phase: String(q.phase), level: String(q.level) });
    } else {
      setEditing(null);
      setForm({ title: "", phase: "1", level: "1" });
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function saveQuestion(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return;

    if (editing) {
      const res = await fetch(`/api/questions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Update failed");
        return;
      }
      const data = await res.json();
      setQuestions((prev) => prev.map((q) => (q.id === data.question.id ? data.question : q)));
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        question_id: "Generating...",
        title: form.title,
        phase: Number(form.phase),
        level: Number(form.level),
        status: "Pending"
      };
      setQuestions((prev) => [optimistic, ...prev]);
      closeModal();

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          phase: Number(form.phase),
          level: Number(form.level)
        })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Create failed");
        setQuestions((prev) => prev.filter((q) => q.id !== tempId));
        setModalOpen(true);
        return;
      }
      const data = await res.json();
      setQuestions((prev) => prev.map((q) => (q.id === tempId ? data.question : q)));
    }

    if (editing) {
      closeModal();
    }
  }

  async function quickAdd(e) {
    e.preventDefault();
    const lines = quickText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parsed = [];
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 3) continue;
      parsed.push({ title: parts[0], phase: Number(parts[1]), level: Number(parts[2]) });
    }
    if (parsed.length === 0) return;

    const temp = parsed.map((p, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      question_id: "Generating...",
      title: p.title,
      phase: p.phase,
      level: p.level,
      status: "Pending"
    }));
    setQuestions((prev) => [...temp, ...prev]);
    setQuickText("");

    const res = await fetch("/api/questions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: parsed })
    });
    if (!res.ok) {
      setQuestions((prev) => prev.filter((q) => !q.id.startsWith("temp-")));
      alert("Bulk add failed");
      return;
    }
    const data = await res.json();
    const created = data.questions || [];
    setQuestions((prev) => {
      const withoutTemp = prev.filter((q) => !q.id.startsWith("temp-"));
      return [...created, ...withoutTemp];
    });
  }

  async function updateStatus(q, status) {
    if (q.status === status) return;

    // Optimistically update UI immediately (0ms delay)
    const prevQuestions = [...questions];
    const prevStrike = [...strikeIds];
    const prevHeatmap = { ...heatmap };

    // 1. Update question in state
    const updatedQuestions = questions.map((item) =>
      item.id === q.id ? { ...item, status } : item
    );
    setQuestions(updatedQuestions);

    // 2. Update heatmap & strike if completed
    if (status === "Completed") {
      setStrikeIds((prev) => (prev.includes(q.question_id) ? prev : [q.question_id, ...prev]));
      const today = new Date().toISOString().slice(0, 10);
      setHeatmap((prev) => ({ ...prev, [today]: (prev[today] || 0) + 1 }));
    }

    // Process network request silently in background
    try {
      const res = await fetch(`/api/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: q.title, status })
      });

      if (!res.ok) throw new Error("Update failed");

      // Sync strictly returned data if needed
      const data = await res.json();
      const finalQuestions = questions.map((item) =>
        item.id === data.question.id ? data.question : item
      );
      setQuestions(finalQuestions);

      // ✅ Also update localStorage cache so status persists across page reloads
      localStorage.setItem("lmt_cache_questions", JSON.stringify(finalQuestions));
    } catch (err) {
      // Revert Optimistic Update
      alert("Network Error: Reverting status.");
      setQuestions(prevQuestions);
      setStrikeIds(prevStrike);
      setHeatmap(prevHeatmap);
    }
  }


  async function deleteQuestion(q) {
    setBusyId(q.id);
    const prev = questions;
    setQuestions((list) => list.filter((item) => item.id !== q.id));
    const res = await fetch(`/api/questions/${q.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setQuestions(prev);
      alert("Delete failed");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.body.classList.toggle("dark", next);
    localStorage.setItem("lmt_theme", next ? "dark" : "light");
  }

  const filtered = useMemo(() => {
    let list = [...questions];
    if (filters.phase) list = list.filter((q) => String(q.phase) === filters.phase);
    if (filters.level) list = list.filter((q) => String(q.level) === filters.level);
    if (filters.status) list = list.filter((q) => q.status === filters.status);
    if (filters.search) {
      list = list.filter((q) => q.question_id.toUpperCase().includes(filters.search.toUpperCase()));
    }

    if (filters.sort === "id-asc") {
      list.sort((a, b) => {
        const [ap, al, aq] = parseId(a.question_id);
        const [bp, bl, bq] = parseId(b.question_id);
        return ap - bp || al - bl || aq - bq;
      });
    } else if (filters.sort === "id-desc") {
      list.sort((a, b) => {
        const [ap, al, aq] = parseId(a.question_id);
        const [bp, bl, bq] = parseId(b.question_id);
        return bp - ap || bl - al || bq - aq;
      });
    } else if (filters.sort === "status") {
      list.sort((a, b) => (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9));
    }

    return list;
  }, [questions, filters]);

  const hardList = useMemo(() => questions.filter((q) => q.status === "Hard"), [questions]);
  const todayList = useMemo(() => questions.filter((q) => q.status === "Today"), [questions]);

  const stats = useMemo(() => {
    const total = questions.length;
    const completed = questions.filter((q) => q.status !== "Pending").length;
    const easy = questions.filter((q) => q.status === "Easy").length;
    const hard = questions.filter((q) => q.status === "Hard").length;
    const todayQ = questions.filter((q) => q.status === "Today").length;
    const pending = questions.filter((q) => q.status === "Pending").length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, easy, hard, today: todayQ, pending, percent };
  }, [questions]);

  const listForTab = tab === "hard" ? hardList : tab === "today" ? todayList : filtered;

  const monthOptions = useMemo(() => {
    const opts = [];
    const start = new Date(2026, 0, 1); // Jan 2026
    const end = new Date(2027, 2, 1);   // Mar 2027

    let current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const monthStr = String(current.getMonth() + 1).padStart(2, "0");
      const labelStr = current.toLocaleString('default', { month: 'long', year: 'numeric' });
      opts.push({ val: `${year}-${monthStr}`, label: labelStr });
      current.setMonth(current.getMonth() + 1);
    }
    // Reverse so the newest months appear at the top of the dropdown
    return opts.reverse();
  }, []);

  const calendarDays = useMemo(() => {
    if (!mounted || !selectedMonth) return [];

    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const days = [];
    // Pad empty slots before first day (Sunday = 0)
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Fill exact dates
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        dayNumber: d,
        count: heatmap[dateStr] || 0
      });
    }
    return days;
  }, [heatmap, selectedMonth, mounted]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="logo">LMT</div>
          <div>
            <h1>Logic Master Tracker – Before DSA</h1>
            <p>Phase-wise logic building practice before DSA</p>
          </div>
        </div>
        <div className="header-time">
          <div>{mounted && now ? now.toLocaleDateString() : ""}</div>
          <div>{mounted && now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</div>
        </div>
        <div className="header-actions">
          <button className="btn solid" onClick={() => openModal(null)}>
            Add Question
          </button>
          <button className="btn ghost" onClick={toggleDark}>
            {dark ? "Light" : "Dark"}
          </button>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="app-tabs">
        <button className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
          All Questions
        </button>
        <button className={`tab ${tab === "today" ? "active" : ""}`} onClick={() => setTab("today")}>
          To Solve Today
        </button>
        <button className={`tab ${tab === "hard" ? "active" : ""}`} onClick={() => setTab("hard")}>
          Solve Again
        </button>
        <button className={`tab ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
      </div>

      <section className={`panel ${tab === "all" || tab === "hard" || tab === "today" ? "active" : ""}`}>
        <div className="toolbar">
          <div className="search">
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by ID (P1-L1-Q1)"
            />
          </div>
          <button className="btn ghost" onClick={() => setQuickOpen((v) => !v)}>
            {quickOpen ? "Close Quick Add" : "Quick Add"}
          </button>
          <div className="selects">
            <select
              value={filters.phase}
              onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
            >
              <option value="">Phase</option>
              <option value="1">Phase 1</option>
              <option value="2">Phase 2</option>
              <option value="3">Phase 3</option>
              <option value="4">Phase 4</option>
              <option value="5">Phase 5</option>
              <option value="6">Phase 6</option>
            </select>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            >
              <option value="">Level</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
              <option value="5">Level 5</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Easy">Easy</option>
              <option value="Hard">Hard</option>
              <option value="Today">Today</option>
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="id-asc">ID Asc</option>
              <option value="id-desc">ID Desc</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {quickOpen ? (
          <form className="quick-add" onSubmit={quickAdd}>
            <div className="quick-hint">
              Format: <span>Title | Phase | Level</span> one per line
            </div>
            <textarea
              rows={5}
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder={"Two Sum | 1 | 1\nPyramid Pattern | 2 | 1\nPalindrome Check | 5 | 2"}
            />
            <button className="btn solid" type="submit">Add All</button>
          </form>
        ) : null}

        <div className="progress-line">
          <div className="progress-text">
            {stats.completed} / {stats.total} Completed
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stats.percent}%` }}></div>
          </div>
        </div>

        {loading ? <div className="empty">Loading...</div> : null}
        {!loading && listForTab.length === 0 ? (
          <div className="empty">No questions found.</div>
        ) : null}

        <div className="table">
          <div className="table-head">
            <div>ID</div>
            <div>Title</div>
            <div>Phase</div>
            <div>Level</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {listForTab.map((q) => (
            <div className="table-row" key={q.id}>
              <div className="cell mono" data-label="ID">{q.question_id}</div>
              <div className="cell title" data-label="Title">
                <div className="title-text">{q.title}</div>
                <div className="subtitle">{phases[q.phase]} · L{q.level}</div>
              </div>
              <div className="cell" data-label="Phase">Phase {q.phase}</div>
              <div className="cell" data-label="Level">L{q.level}</div>
              <div className="cell" data-label="Status">
                <span className={`status-pill ${q.status}`}>{q.status}</span>
              </div>
              <div className="cell actions" data-label="Actions">
                <button className="btn tiny action-done" disabled={busyId === q.id} onClick={() => updateStatus(q, "Completed")}>
                  Done
                </button>
                <button className="btn tiny action-easy" disabled={busyId === q.id} onClick={() => updateStatus(q, "Easy")}>
                  Easy
                </button>
                <button className="btn tiny action-hard" disabled={busyId === q.id} onClick={() => updateStatus(q, "Hard")}>
                  Hard
                </button>
                <button className="btn tiny action-today" disabled={busyId === q.id} onClick={() => updateStatus(q, "Today")}>
                  Today
                </button>
                <button className="btn tiny" disabled={busyId === q.id} onClick={() => openModal(q)}>
                  Edit
                </button>
                <button className="btn tiny danger" disabled={busyId === q.id} onClick={() => deleteQuestion(q)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`panel ${tab === "dashboard" ? "active" : ""}`}>
        <div className="profile-grid">
          <div className="profile-card">
            <div className="avatar">
              {me?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="profile-info">
              <h2>{me?.email?.split("@")[0] || "User"}</h2>
              <p>{me?.email || "user@email.com"}</p>
              <div className="profile-meta">Logic Master Tracker</div>
            </div>
          </div>
          <div className="contribution-card">
            <div className="contribution-header">
              <h3>Streak Calendar</h3>
              <div className="cal-controls">
                <select
                  className="cal-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map(opt => (
                    <option key={opt.val} value={opt.val}>{opt.label}</option>
                  ))}
                </select>
                <div className="strike-count">{strikeIds.length} today</div>
              </div>
            </div>
            <div className="calendar-wrapper">
              <div className="cal-header">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
              <div className="calendar-grid">
                {calendarDays.map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} className="cal-day empty" />;
                  return (
                    <div
                      key={d.date}
                      className={`cal-day level-${Math.min(4, d.count)}`}
                      title={`${d.date} • ${d.count} questions`}
                    >
                      {d.dayNumber}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="contribution-legend">
              <span>Less</span>
              <span className="dot level-0" />
              <span className="dot level-1" />
              <span className="dot level-2" />
              <span className="dot level-3" />
              <span className="dot level-4" />
              <span>More</span>
            </div>
          </div>
        </div>
        <div className="dashboard">
          <div className="dash-card">
            <div className="dash-label">Total Questions</div>
            <div className="dash-value">{stats.total}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Completed</div>
            <div className="dash-value">{stats.completed}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Easy</div>
            <div className="dash-value">{stats.easy}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Hard</div>
            <div className="dash-value">{stats.hard}</div>
          </div>
          <div className="dash-card card-today">
            <div className="dash-label">To Solve Today</div>
            <div className="dash-value">{stats.today}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Pending</div>
            <div className="dash-value">{stats.pending}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Today's Strike</div>
            <div className="dash-value">{strikeIds.length}</div>
          </div>
        </div>
        <div className="strike-panel">
          <div className="strike-header">
            <h3>Today's Strike</h3>
            <span className="strike-count">{strikeIds.length}</span>
          </div>
          <div className="strike-list">
            {strikeIds.length === 0 ? (
              <div className="empty">No questions completed today.</div>
            ) : (
              strikeIds.map((id) => (
                <div key={id} className="strike-item">{id}</div>
              ))
            )}
          </div>
        </div>
      </section>

      {modalOpen ? (
        <div className="modal" onClick={(e) => e.target.classList.contains("modal") && closeModal()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editing ? `Edit ${editing.question_id}` : "Add Question"}</h2>
              <button className="icon-btn" onClick={closeModal}>X</button>
            </div>
            <form onSubmit={saveQuestion}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Question Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phase</label>
                  <select
                    value={form.phase}
                    onChange={(e) => setForm({ ...form, phase: e.target.value })}
                    disabled={!!editing}
                  >
                    <option value="1">Phase 1 – Conditional Thinking</option>
                    <option value="2">Phase 2 – Looping & Patterns</option>
                    <option value="3">Phase 3 – Recursion</option>
                    <option value="4">Phase 4 – Basic Arrays</option>
                    <option value="5">Phase 5 – Strings</option>
                    <option value="6">Phase 6 – Mixed Logical Challenges</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    disabled={!!editing}
                  >
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5</option>
                  </select>
                </div>
              </div>
              {error ? <div className="auth-error">{error}</div> : null}
              <div className="form-actions">
                <button className="btn solid" type="submit">
                  Save
                </button>
                <button className="btn ghost" type="button" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
