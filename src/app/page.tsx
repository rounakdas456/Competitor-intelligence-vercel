"use client";

import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  Eye,
  Flame,
  Gauge,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  Play,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ApiState = "idle" | "loading" | "ready" | "error";

type Analysis = {
  handle: string;
  channel: any;
  videos: any[];
  insight: any;
  insights?: any[];
  thumbnails: any[];
  chats?: any[];
  kpis: {
    total_views: number;
    avg_engagement: number;
    videos_analyzed: number;
    ai_insights_generated: number;
    thumbnails_analyzed: number;
  };
  storage?: { status: string; message?: string };
};

const starterQuestions = [
  "Why is this creator growing?",
  "What content themes are working?",
  "What changed recently?",
  "What is their competitive advantage?"
];

function formatNumber(value: number | string | null | undefined) {
  const num = Number(value || 0);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return `${Math.round(num * 100) / 100}`;
}

function getInsightPayload(insight: any) {
  return insight?.full_analysis || insight || {};
}

async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.detail || "Request failed");
  return data;
}

export default function Home() {
  const [handle, setHandle] = useState("@MrBeast");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [status, setStatus] = useState<ApiState>("idle");
  const [activeTab, setActiveTab] = useState("strategy");
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  async function refreshHealth() {
    const data = await readJson(await fetch("/api/health", { cache: "no-store" }));
    setHealth(data);
  }

  async function loadCompetitors() {
    try {
      const data = await readJson(await fetch("/api/competitors", { cache: "no-store" }));
      setCompetitors(data.competitors || []);
    } catch {
      setCompetitors([]);
    }
  }

  useEffect(() => {
    refreshHealth().catch(() => undefined);
    loadCompetitors();
  }, []);

  async function analyzeCompetitor(targetHandle = handle) {
    setStatus("loading");
    setError("");
    setAnswer("");
    try {
      const data = await readJson(
        await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: targetHandle, includeThumbnails: false, maxResults: 12 })
        })
      );
      setAnalysis(data);
      setHandle(data.handle);
      setActiveTab("strategy");
      setStatus("ready");
      await Promise.all([refreshHealth(), loadCompetitors()]);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Analysis failed");
    }
  }

  async function loadStored(targetHandle: string) {
    setStatus("loading");
    setError("");
    try {
      const data = await readJson(
        await fetch(`/api/insights/${encodeURIComponent(targetHandle.replace(/^@/, ""))}`, { cache: "no-store" })
      );
      setAnalysis(data);
      setHandle(data.handle);
      setStatus("ready");
      setActiveTab("strategy");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load competitor");
    }
  }

  async function askAnalyst(nextQuestion = question) {
    if (!analysis || !nextQuestion.trim()) return;
    setChatLoading(true);
    setAnswer("");
    try {
      const data = await readJson(
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: analysis.handle, question: nextQuestion })
        })
      );
      setAnswer(data.answer);
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : "AI analyst failed");
    } finally {
      setChatLoading(false);
    }
  }

  async function runThumbnailAnalysis(refresh = false) {
    if (!analysis) return;
    setThumbnailLoading(true);
    setError("");
    try {
      const data = await readJson(
        await fetch("/api/thumbnails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: analysis.handle, limit: 4, refresh })
        })
      );
      setAnalysis({
        ...analysis,
        thumbnails: data.thumbnails || [],
        kpis: {
          ...analysis.kpis,
          thumbnails_analyzed: (data.thumbnails || []).length
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thumbnail analysis failed");
    } finally {
      setThumbnailLoading(false);
    }
  }

  const insight = getInsightPayload(analysis?.insight);
  const sortedVideos = useMemo(() => {
    return [...(analysis?.videos || [])].sort(
      (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
    );
  }, [analysis]);

  const chartData = sortedVideos.map((video) => ({
    title: String(video.title || "").slice(0, 28),
    date: new Date(video.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    views: Number(video.views || 0),
    engagement: Number(video.engagement_rate || 0)
  }));

  const sentimentData = [
    { name: "Positive", value: Number(insight.sentiment?.positive || 0.62), color: "#5ee4a7" },
    { name: "Neutral", value: Number(insight.sentiment?.neutral || 0.3), color: "#8da2c0" },
    { name: "Negative", value: Number(insight.sentiment?.negative || 0.08), color: "#ff7474" }
  ];

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><BrainCircuit size={22} /></div>
          <div>
            <strong>Competitor IQ</strong>
            <span>AI YouTube strategist</span>
          </div>
        </div>

        <div className="searchBox">
          <Search size={16} />
          <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@MrBeast" />
        </div>
        <button className="primaryButton" onClick={() => analyzeCompetitor()} disabled={status === "loading"}>
          {status === "loading" ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
          Analyze competitor
        </button>

        <section className="sideSection">
          <div className="sideTitle">Tracked competitors</div>
          {competitors.length === 0 ? (
            <p className="emptyText">Analyzed channels appear here after the first saved report.</p>
          ) : (
            competitors.map((competitor) => (
              <button className="competitorButton" key={competitor.id} onClick={() => loadStored(competitor.handle)}>
                {competitor.thumbnail_url ? <img src={competitor.thumbnail_url} alt="" /> : <Users size={18} />}
                <span>{competitor.title || competitor.handle}</span>
              </button>
            ))
          )}
        </section>

        <section className="sideSection">
          <div className="sideTitle">System</div>
          <div className="healthCard">
            <span>Database</span>
            <strong className={health?.database === "ready" ? "ok" : "warn"}>
              {health?.database || "checking"}
            </strong>
          </div>
          <button className="ghostButton" onClick={refreshHealth}>
            <RefreshCcw size={15} />
            Refresh status
          </button>
        </section>
      </aside>

      <section className="workspace">
        <header className="hero">
          <div>
            <p className="eyebrow">AI competitor analyst for businesses</p>
            <h1>Strategic intelligence from rival YouTube channels</h1>
            <p className="subcopy">
              Fetch videos, analyze positioning, decode thumbnails, store findings in Supabase, and ask follow-up
              strategy questions from one deployable Vercel app.
            </p>
          </div>
          <div className="heroCard">
            <Gauge size={22} />
            <span>Storage</span>
            <strong>{analysis?.storage?.status || health?.database || "ready"}</strong>
          </div>
        </header>

        {error && <div className="errorBanner">{error}</div>}

        {!analysis ? (
          <section className="welcomeGrid">
            <div className="welcomePanel">
              <Flame size={28} />
              <h2>Run a competitor scan</h2>
              <p>
                Start with a YouTube handle. The app will fetch recent videos, calculate engagement, analyze strategy,
                inspect thumbnails, and save the full report to Supabase.
              </p>
              <div className="quickHandles">
                {["@MrBeast", "@mkbhd", "@veritasium", "@aliabdaal"].map((item) => (
                  <button key={item} onClick={() => analyzeCompetitor(item)}>{item}</button>
                ))}
              </div>
            </div>
            <div className="signalPanel">
              <div><Target /><span>Positioning strategy</span></div>
              <div><Eye /><span>Thumbnail psychology</span></div>
              <div><TrendingUp /><span>Virality mechanics</span></div>
              <div><MessageSquareText /><span>Ask AI Analyst</span></div>
            </div>
          </section>
        ) : (
          <>
            <section className="summaryHeader">
              <div className="channelIdentity">
                {analysis.channel?.thumbnail_url && <img src={analysis.channel.thumbnail_url} alt="" />}
                <div>
                  <h2>{analysis.channel?.title || analysis.handle}</h2>
                  <span>{analysis.handle}</span>
                </div>
              </div>
              <div className="tabs">
                {[
                  ["strategy", "Strategy", BrainCircuit],
                  ["videos", "Videos", Video],
                  ["thumbnails", "Thumbnails", ImageIcon],
                  ["trends", "Trends", BarChart3],
                  ["analyst", "Analyst", Bot]
                ].map(([key, label, Icon]: any) => (
                  <button className={activeTab === key ? "active" : ""} key={key} onClick={() => setActiveTab(key)}>
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="kpiGrid">
              <Kpi icon={<Play />} label="Total views" value={formatNumber(analysis.kpis.total_views)} />
              <Kpi icon={<Activity />} label="Avg engagement" value={`${analysis.kpis.avg_engagement}%`} />
              <Kpi icon={<Video />} label="Videos analyzed" value={analysis.kpis.videos_analyzed} />
              <Kpi icon={<ImageIcon />} label="Thumbnails decoded" value={analysis.kpis.thumbnails_analyzed} />
            </section>

            {activeTab === "strategy" && (
              <section className="contentGrid">
                <article className="panel wide">
                  <p className="panelLabel">Strategy summary</p>
                  <h3>{analysis.insight?.content_theme}</h3>
                  <p>{analysis.insight?.strategy_summary}</p>
                  <div className="insightRows">
                    <InsightRow label="Virality reason" value={analysis.insight?.virality_reason} />
                    <InsightRow label="Audience type" value={analysis.insight?.audience_type} />
                    <InsightRow label="Emotional hook" value={analysis.insight?.emotional_hook} />
                    <InsightRow label="Positioning" value={insight.positioning_strategy} />
                  </div>
                </article>
                <article className="panel">
                  <p className="panelLabel">Strategic signals</p>
                  <div className="pillStack">
                    {(insight.strategic_insights || []).map((item: string) => <span key={item}>{item}</span>)}
                  </div>
                  <p className="panelLabel withGap">Recommended response</p>
                  <ul className="actionList">
                    {(insight.recommended_response || []).map((item: string) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              </section>
            )}

            {activeTab === "videos" && (
              <section className="videoGrid">
                {analysis.videos.map((video) => (
                  <article className="videoCard" key={video.video_id}>
                    {video.thumbnail_url && <img src={video.thumbnail_url} alt="" />}
                    <div>
                      <h3>{video.title}</h3>
                      <p>{formatNumber(video.views)} views | {formatNumber(video.likes)} likes | {Number(video.engagement_rate).toFixed(2)}% engagement</p>
                      <a href={video.video_url} target="_blank" rel="noreferrer">Open on YouTube</a>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {activeTab === "thumbnails" && (
              <section className="thumbnailGrid">
                <div className="thumbnailActions">
                  <div>
                    <p className="panelLabel">Thumbnail Analyzer</p>
                    <h3>Decode the visual hooks behind the top-performing videos.</h3>
                  </div>
                  <button className="primaryButton compact" onClick={() => runThumbnailAnalysis(true)} disabled={thumbnailLoading}>
                    {thumbnailLoading ? <Loader2 className="spin" size={16} /> : <ImageIcon size={16} />}
                    Analyze thumbnails
                  </button>
                </div>
                {analysis.thumbnails.length === 0 ? (
                  <div className="panel wide">No thumbnail analysis has been saved yet. Click Analyze thumbnails to inspect the top videos with Gemini 2.5 vision.</div>
                ) : (
                  analysis.thumbnails.map((item) => {
                    const video = analysis.videos.find((entry) => entry.video_id === item.video_id);
                    return (
                      <article className="thumbnailCard" key={item.video_id}>
                        {video?.thumbnail_url && <img src={video.thumbnail_url} alt="" />}
                        <div>
                          <h3>{video?.title || item.video_id}</h3>
                          <InsightRow label="Visual hook" value={item.visual_hook} />
                          <InsightRow label="Strategy" value={item.thumbnail_strategy} />
                          <InsightRow label="Emotion" value={item.emotion_signal} />
                          <InsightRow label="Test next" value={item.improvement_idea} />
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            )}

            {activeTab === "trends" && (
              <section className="chartGrid">
                <ChartPanel title="Views over time">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData}>
                      <CartesianGrid stroke="#1e2a3e" />
                      <XAxis dataKey="date" stroke="#8493aa" />
                      <YAxis stroke="#8493aa" tickFormatter={formatNumber} />
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid #26344d" }} />
                      <Area type="monotone" dataKey="views" stroke="#6ee7b7" fill="#6ee7b733" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Engagement by upload">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid stroke="#1e2a3e" />
                      <XAxis dataKey="date" stroke="#8493aa" />
                      <YAxis stroke="#8493aa" />
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid #26344d" }} />
                      <Bar dataKey="engagement" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Audience sentiment">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105}>
                        {sentimentData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid #26344d" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </section>
            )}

            {activeTab === "analyst" && (
              <section className="analystPanel">
                <div>
                  <p className="panelLabel">Ask AI Analyst</p>
                  <h3>Ask a strategic follow-up using the saved competitor context.</h3>
                  <div className="starterQuestions">
                    {starterQuestions.map((item) => (
                      <button key={item} onClick={() => { setQuestion(item); askAnalyst(item); }}>{item}</button>
                    ))}
                  </div>
                  <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What is their competitive advantage?" />
                  <button className="primaryButton compact" onClick={() => askAnalyst()} disabled={chatLoading}>
                    {chatLoading ? <Loader2 className="spin" size={16} /> : <Bot size={16} />}
                    Ask analyst
                  </button>
                </div>
                <div className="answerBox">
                  {chatLoading ? "Reading stored context..." : answer || "The analyst response will appear here."}
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <article className="kpiCard">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InsightRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="insightRow">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="panel chartPanel">
      <p className="panelLabel">{title}</p>
      {children}
    </article>
  );
}
