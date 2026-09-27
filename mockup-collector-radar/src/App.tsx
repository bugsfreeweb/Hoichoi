import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppTab,
  CATEGORIES,
  LIKE_TIERS,
  LogAction,
  ModelVersion,
  NewsPost,
  PLATFORMS,
  PostStatus,
  PublishLog,
  SECTOR_COUNT,
  STATUS_LABEL,
  TREND_MODES,
  TrendMode,
} from './types/news';
import { generatePost } from './utils/generator';
import { computeRoseStats } from './utils/polar';
import { Header } from './components/Header';
import { NewsRadar } from './components/NewsRadar';
import { DashboardSide } from './components/DashboardSide';
import { AIModelLab } from './components/AIModelLab';
import { PublishRecords } from './components/PublishRecords';
import { ModerationQueue } from './components/ModerationQueue';

const MAX_POSTS = 1500;
const emptyMatrix = () => Array.from({ length: SECTOR_COUNT }, () => new Array(LIKE_TIERS.length).fill(0));

const INITIAL_VERSIONS: ModelVersion[] = [
  { id: 'v১.০', base: 'mBERT-multilingual', accuracy: 0.842, f1: 0.831, samples: 12400, epochs: 5, ts: Date.now() - 86400000 * 6, status: 'archived' },
  { id: 'v১.৩', base: 'BanglaBERT-base', accuracy: 0.887, f1: 0.879, samples: 18250, epochs: 8, ts: Date.now() - 86400000 * 2, status: 'active' },
];

let logSeq = 0;
function makeLog(p: NewsPost, action: LogAction, actor: string, note: string): PublishLog {
  logSeq += 1;
  return { id: `log-${logSeq}-${p.id}`, postId: p.id, headline: p.headline, category: p.predicted, action, actor, ts: Date.now(), note };
}

function seedData() {
  const posts: NewsPost[] = [];
  const counts = emptyMatrix();
  const logs: PublishLog[] = [];
  const now = Date.now();
  for (let i = 0; i < 240; i++) {
    const p = generatePost(1000 + i, TREND_MODES[0], 0.887);
    p.ts = now - (240 - i) * 2500;
    posts.unshift(p);
    counts[p.sectorIndex][p.tierIndex]++;
    if (p.status === 'published') {
      const l = makeLog(p, 'auto_publish', 'AI মডেল v১.৩', `আস্থা ${Math.round(p.confidence * 100)}%`);
      l.ts = p.ts;
      logs.unshift(l);
    }
  }
  // Some historical manual unpublish/reject decisions
  posts.slice(20, 240).forEach((p, i) => {
    if (p.moderation !== 'cleared' && i % 3 === 0) {
      p.status = p.flags.length ? 'rejected' : 'unpublished';
      p.moderation = 'cleared';
      const l = makeLog(p, p.status === 'rejected' ? 'reject' : 'unpublish', 'মডারেটর: রাহাত', p.flags.length ? 'নীতিমালা লঙ্ঘন' : 'যাচাই সাপেক্ষে স্থগিত');
      l.ts = p.ts + 30000;
      logs.push(l);
    }
  });
  logs.sort((a, b) => b.ts - a.ts);
  return { posts, counts, logs };
}

export function App() {
  const seed = useMemo(seedData, []);
  const [posts, setPosts] = useState<NewsPost[]>(seed.posts);
  const [counts, setCounts] = useState<number[][]>(seed.counts);
  const [logs, setLogs] = useState<PublishLog[]>(seed.logs);
  const [versions, setVersions] = useState<ModelVersion[]>(INITIAL_VERSIONS);
  const [resolved, setResolved] = useState(0);

  const [tab, setTab] = useState<AppTab>('dashboard');
  const [isStreaming, setIsStreaming] = useState(true);
  const [intervalMs, setIntervalMs] = useState(500);
  const [trend, setTrend] = useState<TrendMode>(TREND_MODES[0]);
  const [visibleTiers, setVisibleTiers] = useState<boolean[]>(() => new Array(7).fill(true));
  const [metric, setMetric] = useState<'percentage' | 'count'>('percentage');
  const [sweepEnabled, setSweepEnabled] = useState(true);
  const [lockedSector, setLockedSector] = useState<number | null>(null);
  const [hoveredSector, setHoveredSector] = useState<number | null>(null);
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  const seqRef = useRef(1240);
  const activeModel = versions.find((v) => v.status === 'active') ?? INITIAL_VERSIONS[1];
  const modelRef = useRef(activeModel);
  modelRef.current = activeModel;

  const stats = useMemo(() => computeRoseStats(counts, visibleTiers), [counts, visibleTiers]);

  const statusCounts = useMemo(() => {
    const c: Record<PostStatus, number> = { published: 0, unpublished: 0, pending: 0, rejected: 0 };
    posts.forEach((p) => c[p.status]++);
    return c;
  }, [posts]);

  const moderationCount = useMemo(() => posts.filter((p) => p.moderation !== 'cleared').length, [posts]);

  const liveAccuracy = useMemo(() => {
    const recent = posts.slice(0, 300);
    if (!recent.length) return 0;
    return recent.filter((p) => p.category === p.predicted).length / recent.length;
  }, [posts]);

  const ingest = useCallback((batch: NewsPost[]) => {
    const m = modelRef.current;
    setCounts((prev) => {
      const next = prev.map((r) => [...r]);
      batch.forEach((p) => next[p.sectorIndex][p.tierIndex]++);
      return next;
    });
    setPosts((prev) => [...batch.slice().reverse(), ...prev].slice(0, MAX_POSTS));
    const newLogs = batch
      .filter((p) => p.status === 'published')
      .map((p) => makeLog(p, 'auto_publish', `AI মডেল ${m.id}`, `আস্থা ${Math.round(p.confidence * 100)}%`));
    if (newLogs.length) setLogs((prev) => [...newLogs.reverse(), ...prev].slice(0, 800));
  }, []);

  const createPost = useCallback(
    () => {
      seqRef.current += 1;
      return generatePost(seqRef.current, trend, modelRef.current.accuracy);
    },
    [trend]
  );

  useEffect(() => {
    if (!isStreaming) return;
    const t = setInterval(() => ingest([createPost()]), intervalMs);
    return () => clearInterval(t);
  }, [isStreaming, intervalMs, createPost, ingest]);

  const handleSetStatus = (id: string, status: PostStatus, note: string) => {
    const p = posts.find((x) => x.id === id);
    if (!p) return;
    if (p.moderation !== 'cleared') setResolved((r) => r + 1);
    const action: LogAction = status === 'published' ? 'publish' : status === 'rejected' ? 'reject' : 'unpublish';
    setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, status, moderation: 'cleared' } : x)));
    setLogs((prev) => [makeLog(p, action, 'মডারেটর: আপনি', note), ...prev]);
  };

  const handleCorrect = (id: string, newCat: number) => {
    const p = posts.find((x) => x.id === id);
    if (!p || p.predicted === newCat) return;
    const newSector = newCat * PLATFORMS.length + p.platform;
    setCounts((prev) => {
      const next = prev.map((r) => [...r]);
      next[p.sectorIndex][p.tierIndex] = Math.max(0, next[p.sectorIndex][p.tierIndex] - 1);
      next[newSector][p.tierIndex]++;
      return next;
    });
    setPosts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, predicted: newCat, category: newCat, sectorIndex: newSector, corrected: true } : x))
    );
    setLogs((prev) => [
      makeLog({ ...p, predicted: newCat }, 'correct', 'মডারেটর: আপনি', `${CATEGORIES[p.predicted].name} → ${CATEGORIES[newCat].name}`),
      ...prev,
    ]);
  };

  const handleBulkApprove = () => {
    const targets = posts.filter((p) => p.moderation === 'review' && p.risk < 0.4);
    if (!targets.length) return;
    const ids = new Set(targets.map((t) => t.id));
    setResolved((r) => r + targets.length);
    setPosts((prev) => prev.map((x) => (ids.has(x.id) ? { ...x, status: 'published', moderation: 'cleared' } : x)));
    setLogs((prev) => [...targets.map((t) => makeLog(t, 'publish', 'মডারেটর: আপনি (বাল্ক)', 'কম-ঝুঁকি বাল্ক অনুমোদন')), ...prev]);
  };

  const handleDeploy = (id: string) => {
    setVersions((prev) => prev.map((v) => ({ ...v, status: v.id === id ? 'active' : 'archived' })));
  };

  const handleReset = () => {
    setCounts(emptyMatrix());
    setPosts([]);
    setLogs([]);
    setResolved(0);
    setLockedSector(null);
  };

  const handleExport = () => {
    const header = ['আইডি', 'সময়', 'শিরোনাম', 'ক্যাটাগরি', 'প্ল্যাটফর্ম', 'সূত্র', 'লাইক', 'শেয়ার', 'মন্তব্য', 'AI আস্থা', 'অবস্থা', 'ফ্ল্যাগ'];
    const rows = posts.map((p) =>
      [
        p.id,
        new Date(p.ts).toLocaleString('bn-BD'),
        `"${p.headline.replace(/"/g, '""')}"`,
        CATEGORIES[p.predicted].name,
        PLATFORMS[p.platform].name,
        p.source,
        p.likes,
        p.shares,
        p.comments,
        `${Math.round(p.confidence * 100)}%`,
        STATUS_LABEL[p.status].label,
        p.flags.join('|'),
      ].join(',')
    );
    const blob = new Blob(['\uFEFF' + [header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sangbad-radar-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full bg-[#070B12] text-[#F0F6FC] flex flex-col lg:h-screen lg:overflow-hidden">
      <Header
        tab={tab}
        onTab={setTab}
        isStreaming={isStreaming}
        onToggleStream={() => setIsStreaming((s) => !s)}
        intervalMs={intervalMs}
        onInterval={setIntervalMs}
        trend={trend}
        onTrend={setTrend}
        onCollectOne={() => ingest([createPost()])}
        onCollectBurst={() => ingest(Array.from({ length: 25 }, () => createPost()))}
        onReset={handleReset}
        onExport={handleExport}
        moderationCount={moderationCount}
        recordCount={posts.length}
        activeModelLabel={`${activeModel.id} · ${activeModel.base} (${(activeModel.accuracy * 100).toFixed(1)}%)`.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d])}
      />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'dashboard' && (
          <div className="flex flex-col lg:flex-row gap-3 p-3 lg:h-full">
            <section className="flex-1 min-w-0 flex flex-col lg:h-full">
              <NewsRadar
                counts={counts}
                stats={stats}
                visibleTiers={visibleTiers}
                onToggleTier={(t) =>
                  setVisibleTiers((prev) => {
                    if (prev.filter(Boolean).length === 1 && prev[t]) return new Array(7).fill(true);
                    const n = [...prev];
                    n[t] = !n[t];
                    return n;
                  })
                }
                onResetTiers={() => setVisibleTiers(new Array(7).fill(true))}
                recentPosts={posts}
                isStreaming={isStreaming}
                sweepEnabled={sweepEnabled}
                onToggleSweep={() => setSweepEnabled((s) => !s)}
                metric={metric}
                onChangeMetric={setMetric}
                lockedSector={lockedSector}
                onSelectSector={setLockedSector}
                hoveredSector={hoveredSector}
                onHoverSector={setHoveredSector}
                hoveredTier={hoveredTier}
                onHoverTier={setHoveredTier}
              />
            </section>
            <DashboardSide
              stats={stats}
              posts={posts}
              statusCounts={statusCounts}
              moderationCount={moderationCount}
              liveAccuracy={liveAccuracy}
              modelAccuracy={activeModel.accuracy}
              lockedSector={lockedSector}
              onSelectSector={setLockedSector}
              onHoverSector={setHoveredSector}
              onOpenModeration={() => setTab('moderation')}
            />
          </div>
        )}
        {tab === 'ai' && (
          <AIModelLab
            posts={posts}
            totalCollected={stats.total}
            versions={versions}
            onAddVersion={(v) => setVersions((prev) => [...prev, v])}
            onDeploy={handleDeploy}
          />
        )}
        {tab === 'records' && <PublishRecords posts={posts} logs={logs} statusCounts={statusCounts} onSetStatus={handleSetStatus} />}
        {tab === 'moderation' && (
          <ModerationQueue
            posts={posts}
            resolvedCount={resolved}
            onSetStatus={handleSetStatus}
            onCorrect={handleCorrect}
            onBulkApprove={handleBulkApprove}
          />
        )}
      </main>
    </div>
  );
}

export default App;
