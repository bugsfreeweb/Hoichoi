import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrainCircuit, CheckCircle2, Cpu, Hammer, Hash, Rocket, Target, Terminal } from 'lucide-react';
import { CATEGORIES, ModelVersion, NewsPost } from '../types/news';
import { bnNum, bnPct, bnTime, toBn } from '../utils/bn';

interface Props {
  posts: NewsPost[];
  totalCollected: number;
  versions: ModelVersion[];
  onAddVersion: (v: ModelVersion) => void;
  onDeploy: (id: string) => void;
}

const BASE_MODELS = [
  { id: 'BanglaBERT-base', ceil: 0.948, desc: 'বাংলা ভাষার জন্য প্রি-ট্রেইনড ট্রান্সফর্মার' },
  { id: 'XLM-RoBERTa-large', ceil: 0.936, desc: 'বহুভাষিক বড় ট্রান্সফর্মার মডেল' },
  { id: 'mBERT-multilingual', ceil: 0.905, desc: 'বহুভাষিক BERT (হালকা)' },
  { id: 'BiLSTM-FastText', ceil: 0.858, desc: 'দ্রুত ও হালকা কাস্টম নিউরাল নেটওয়ার্ক' },
];

interface EpochPoint {
  acc: number;
  val: number;
  loss: number;
}

export const AIModelLab: React.FC<Props> = ({ posts, totalCollected, versions, onAddVersion, onDeploy }) => {
  const [base, setBase] = useState(BASE_MODELS[0].id);
  const [epochs, setEpochs] = useState(8);
  const [lr, setLr] = useState('2e-5');
  const [augment, setAugment] = useState(true);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<EpochPoint[]>([]);
  const [logs, setLogs] = useState<string[]>(['> প্রস্তুত। নতুন মডেল তৈরি করতে প্যারামিটার বাছাই করুন।']);
  const finalRef = useRef(0);
  const epochRef = useRef(0);

  const active = versions.find((v) => v.status === 'active');

  // Confusion matrix & metrics from verified samples
  const { matrix, metrics, overall } = useMemo(() => {
    const m = Array.from({ length: 6 }, () => new Array(6).fill(0));
    posts.forEach((p) => m[p.category][p.predicted]++);
    const met = CATEGORIES.map((c) => {
      const tp = m[c.index][c.index];
      const colSum = m.reduce((a, r) => a + r[c.index], 0);
      const rowSum = m[c.index].reduce((a, b) => a + b, 0);
      const precision = colSum ? tp / colSum : 0;
      const recall = rowSum ? tp / rowSum : 0;
      const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
      const conf = posts.filter((p) => p.predicted === c.index);
      const avgConf = conf.length ? conf.reduce((a, p) => a + p.confidence, 0) / conf.length : 0;
      return { precision, recall, f1, support: rowSum, avgConf };
    });
    const correct = posts.filter((p) => p.category === p.predicted).length;
    return { matrix: m, metrics: met, overall: posts.length ? correct / posts.length : 0 };
  }, [posts]);

  const keywords = useMemo(() => {
    const map = new Map<string, { n: number; cat: number; likes: number }>();
    posts.forEach((p) => {
      const e = map.get(p.keyword) ?? { n: 0, cat: p.category, likes: 0 };
      e.n++;
      e.likes += p.likes;
      map.set(p.keyword, e);
    });
    return [...map.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  }, [posts]);

  const maxCell = Math.max(1, ...matrix.flat());

  const startTraining = () => {
    const bm = BASE_MODELS.find((b) => b.id === base)!;
    const dataBonus = Math.min(0.01, totalCollected / 150000);
    const final = Math.min(
      0.975,
      bm.ceil - 0.07 * Math.exp(-epochs / 5) + (augment ? 0.008 : 0) + dataBonus - Math.random() * 0.012 - (lr === '1e-3' ? 0.03 : 0)
    );
    finalRef.current = final;
    epochRef.current = 0;
    setHistory([]);
    setLogs([
      `> মডেল তৈরি শুরু: ${base}`,
      `> ট্রেনিং ডেটা: ${bnNum(totalCollected)}টি সংগৃহীত পোস্ট (৮০% ট্রেন / ২০% ভ্যালিডেশন)`,
      `> ইপক: ${toBn(epochs)} · লার্নিং রেট: ${lr} · ডেটা অগমেন্টেশন: ${augment ? 'চালু' : 'বন্ধ'}`,
      '> বাংলা টোকেনাইজার লোড হচ্ছে... সম্পন্ন',
    ]);
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      epochRef.current += 1;
      const e = epochRef.current;
      const f = finalRef.current;
      const prog = 1 - Math.exp((-3 * e) / epochs);
      const acc = Math.min(0.99, 0.5 + (f + 0.02 - 0.5) * prog + (Math.random() - 0.5) * 0.01);
      const val = Math.min(0.99, 0.48 + (f - 0.48) * prog + (Math.random() - 0.5) * 0.012);
      const loss = 1.6 * Math.exp((-2.6 * e) / epochs) + 0.14 + Math.random() * 0.03;
      setHistory((h) => [...h, { acc, val, loss }]);
      setLogs((l) => [
        ...l,
        `> ইপক ${toBn(e)}/${toBn(epochs)} — লস: ${toBn(loss.toFixed(3))} · ট্রেন নির্ভুলতা: ${bnPct(acc * 100)} · ভ্যালিডেশন: ${bnPct(val * 100)}`,
      ]);
      if (e >= epochs) {
        setRunning(false);
        const ver: ModelVersion = {
          id: `v${toBn(versions.length + 1)}.${toBn(Math.floor(Math.random() * 9))}`,
          base,
          accuracy: f,
          f1: f - 0.006 - Math.random() * 0.008,
          samples: totalCollected,
          epochs,
          ts: Date.now(),
          status: 'candidate',
        };
        onAddVersion(ver);
        setLogs((l) => [...l, `✓ মডেল তৈরি সম্পন্ন! চূড়ান্ত নির্ভুলতা ${bnPct(f * 100)} — "ডিপ্লয়" করে সক্রিয় করুন।`]);
      }
    }, 650);
    return () => clearInterval(timer);
  }, [running]);

  // Chart
  const W = 520;
  const H = 170;
  const P = 28;
  const xFor = (i: number) => P + (i / Math.max(1, epochs - 1)) * (W - P * 2);
  const yFor = (v: number) => H - P + -v * (H - P * 1.6);
  const line = (key: keyof EpochPoint, scale = 1) =>
    history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(h[key] / scale).toFixed(1)}`).join(' ');

  const progress = running || history.length ? (history.length / epochs) * 100 : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 p-3">
      {/* Builder */}
      <section className="rounded-lg bg-[#0E1522] border border-[#1C293D] p-4 flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC]">
          <Hammer className="w-4 h-4 text-[#00F0FF]" /> নতুন মডেল তৈরি করুন
        </h2>
        <div className="space-y-1.5">
          <div className="text-[11px] text-[#8B9EB7]">বেস মডেল</div>
          {BASE_MODELS.map((b) => (
            <label
              key={b.id}
              className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                base === b.id ? 'border-[#00F0FF]/60 bg-[#00F0FF]/5' : 'border-[#1C293D] hover:border-[#2E4466]'
              }`}
            >
              <input type="radio" className="mt-1 accent-[#00F0FF]" checked={base === b.id} onChange={() => setBase(b.id)} disabled={running} />
              <div>
                <div className="text-xs font-semibold text-[#F0F6FC] font-mono">{b.id}</div>
                <div className="text-[10px] text-[#8B9EB7]">{b.desc} · সর্বোচ্চ সম্ভাব্য ~{bnPct(b.ceil * 100)}</div>
              </div>
            </label>
          ))}
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-[#8B9EB7]">
            <span>ইপক সংখ্যা</span>
            <span className="text-[#00F0FF] font-semibold">{toBn(epochs)}</span>
          </div>
          <input type="range" min={3} max={20} value={epochs} disabled={running} onChange={(e) => setEpochs(+e.target.value)} className="w-full accent-[#00F0FF]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[11px] text-[#8B9EB7] mb-1">লার্নিং রেট</div>
            <select value={lr} disabled={running} onChange={(e) => setLr(e.target.value)} className="w-full bg-[#070B12] border border-[#1C293D] rounded px-2 py-1 text-xs text-[#F0F6FC] font-mono">
              <option value="2e-5">2e-5 (প্রস্তাবিত)</option>
              <option value="5e-5">5e-5</option>
              <option value="1e-3">1e-3 (ঝুঁকিপূর্ণ)</option>
            </select>
          </div>
          <label className="flex items-end gap-2 text-xs text-[#F0F6FC] pb-1 cursor-pointer">
            <input type="checkbox" checked={augment} disabled={running} onChange={(e) => setAugment(e.target.checked)} className="accent-[#00F0FF]" />
            ডেটা অগমেন্টেশন
          </label>
        </div>
        <div className="text-[11px] text-[#8B9EB7] p-2 rounded bg-[#070B12] border border-[#1C293D]">
          ট্রেনিং ডেটাসেট: <span className="text-[#F0F6FC] font-semibold">{bnNum(totalCollected)}</span> টি লেবেলযুক্ত পোস্ট (৬টি ক্যাটাগরি)
        </div>
        <button
          onClick={startTraining}
          disabled={running}
          className="flex items-center justify-center gap-2 py-2 rounded font-semibold text-sm bg-[#00F0FF] text-[#070B12] disabled:opacity-50 disabled:cursor-wait hover:bg-[#00F0FF]/90"
        >
          <Cpu className="w-4 h-4" />
          {running ? `ট্রেনিং চলছে... ${toBn(Math.round(progress))}%` : 'মডেল তৈরি শুরু করুন'}
        </button>
        <div className="h-1.5 rounded bg-[#070B12] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#00F0FF] to-[#A78BFA] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {/* Training curve & logs */}
      <section className="xl:col-span-2 rounded-lg bg-[#0E1522] border border-[#1C293D] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC]">
            <BrainCircuit className="w-4 h-4 text-[#A78BFA]" /> ট্রেনিং কার্ভ (নির্ভুলতা ও লস)
          </h2>
          <div className="flex gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-[#00F0FF]"><span className="w-3 h-0.5 bg-[#00F0FF]" />ট্রেন নির্ভুলতা</span>
            <span className="flex items-center gap-1 text-[#A78BFA]"><span className="w-3 h-0.5 bg-[#A78BFA]" />ভ্যালিডেশন</span>
            <span className="flex items-center gap-1 text-[#FB923C]"><span className="w-3 h-0.5 bg-[#FB923C]" />লস</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44 bg-[#070B12] rounded border border-[#1C293D]">
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <g key={g}>
              <line x1={P} x2={W - P} y1={yFor(g)} y2={yFor(g)} stroke="#1C293D" strokeDasharray="3 3" />
              <text x={4} y={yFor(g) + 3} fontSize={9} fill="#4A5D75">{toBn(g * 100)}%</text>
            </g>
          ))}
          {history.length === 0 && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fill="#4A5D75" fontSize={12}>
              মডেল তৈরি শুরু করলে এখানে লাইভ কার্ভ দেখা যাবে
            </text>
          )}
          <path d={line('loss', 1.8)} fill="none" stroke="#FB923C" strokeWidth={1.8} />
          <path d={line('acc')} fill="none" stroke="#00F0FF" strokeWidth={2} />
          <path d={line('val')} fill="none" stroke="#A78BFA" strokeWidth={2} strokeDasharray="5 3" />
          {history.map((h, i) => (
            <circle key={i} cx={xFor(i)} cy={yFor(h.val)} r={2.5} fill="#A78BFA" />
          ))}
        </svg>
        <div className="h-36 overflow-y-auto rounded bg-[#070B12] border border-[#1C293D] p-2 text-[11px] leading-relaxed">
          <div className="flex items-center gap-1.5 text-[#8B9EB7] mb-1">
            <Terminal className="w-3 h-3" /> ট্রেনিং লগ
          </div>
          {logs.map((l, i) => (
            <div key={i} className={l.startsWith('✓') ? 'text-[#22C55E] font-semibold' : 'text-[#8B9EB7]'}>
              {l}
            </div>
          ))}
        </div>
      </section>

      {/* Versions */}
      <section className="xl:col-span-3 rounded-lg bg-[#0E1522] border border-[#1C293D] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1C293D] flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC]">
            <Rocket className="w-4 h-4 text-[#22C55E]" /> মডেল সংস্করণ ও ডিপ্লয়মেন্ট
          </h2>
          {active && (
            <span className="text-[11px] text-[#8B9EB7]">
              সক্রিয়: <span className="text-[#22C55E] font-semibold">{active.id} · {active.base}</span>
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[#8B9EB7] bg-[#070B12]/60">
              <tr>
                {['সংস্করণ', 'বেস মডেল', 'নির্ভুলতা', 'F1 স্কোর', 'ট্রেনিং নমুনা', 'ইপক', 'তৈরির সময়', 'অবস্থা', 'কার্যক্রম'].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C293D]/60">
              {versions.slice().reverse().map((v) => (
                <tr key={v.id + v.ts} className={v.status === 'active' ? 'bg-[#22C55E]/5' : ''}>
                  <td className="px-3 py-2 font-semibold text-[#F0F6FC]">{v.id}</td>
                  <td className="px-3 py-2 font-mono text-[#8B9EB7]">{v.base}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#F0F6FC] font-semibold">{bnPct(v.accuracy * 100)}</span>
                      <div className="w-16 h-1.5 bg-[#070B12] rounded overflow-hidden">
                        <div className="h-full bg-[#A78BFA]" style={{ width: `${v.accuracy * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[#F0F6FC]">{toBn(v.f1.toFixed(3))}</td>
                  <td className="px-3 py-2 text-[#8B9EB7]">{bnNum(v.samples)}</td>
                  <td className="px-3 py-2 text-[#8B9EB7]">{toBn(v.epochs)}</td>
                  <td className="px-3 py-2 text-[#8B9EB7]">{bnTime(v.ts)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        v.status === 'active'
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : v.status === 'candidate'
                          ? 'bg-[#00F0FF]/15 text-[#00F0FF]'
                          : 'bg-[#1C293D] text-[#8B9EB7]'
                      }`}
                    >
                      {v.status === 'active' ? '● সক্রিয়' : v.status === 'candidate' ? 'নতুন প্রার্থী' : 'আর্কাইভ'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {v.status !== 'active' ? (
                      <button onClick={() => onDeploy(v.id)} className="px-2.5 py-1 rounded bg-[#1C293D] hover:bg-[#22C55E]/20 text-[#22C55E] text-[11px] font-semibold">
                        ডিপ্লয় করুন
                      </button>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confusion matrix */}
      <section className="rounded-lg bg-[#0E1522] border border-[#1C293D] p-4">
        <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC] mb-1">
          <Target className="w-4 h-4 text-[#F59E0B]" /> কনফিউশন ম্যাট্রিক্স
        </h2>
        <p className="text-[11px] text-[#8B9EB7] mb-2">সারি = যাচাইকৃত আসল ক্যাটাগরি, কলাম = AI অনুমান · সামগ্রিক: <span className="text-[#A78BFA] font-semibold">{bnPct(overall * 100)}</span></p>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: '64px repeat(6, 1fr)' }}>
          <div />
          {CATEGORIES.map((c) => (
            <div key={c.id} className="text-[9px] text-center truncate" style={{ color: c.color }}>{c.name}</div>
          ))}
          {matrix.map((row, r) => (
            <React.Fragment key={r}>
              <div className="text-[10px] truncate self-center" style={{ color: CATEGORIES[r].color }}>{CATEGORIES[r].name}</div>
              {row.map((v, c) => (
                <div
                  key={c}
                  className="aspect-square flex items-center justify-center text-[10px] rounded-sm"
                  style={{
                    background: r === c ? `rgba(34,197,94,${0.12 + (v / maxCell) * 0.8})` : v ? `rgba(244,63,94,${0.15 + (v / maxCell) * 2})` : '#070B12',
                    color: v ? '#F0F6FC' : '#4A5D75',
                  }}
                  title={`${CATEGORIES[r].name} → ${CATEGORIES[c].name}: ${v}`}
                >
                  {toBn(v)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Per-category metrics */}
      <section className="rounded-lg bg-[#0E1522] border border-[#1C293D] p-4">
        <h2 className="font-display font-bold text-[#F0F6FC] mb-2">ক্যাটাগরিভিত্তিক AI বিশ্লেষণ</h2>
        <table className="w-full text-xs">
          <thead className="text-[#8B9EB7]">
            <tr>
              <th className="text-left font-medium py-1">ক্যাটাগরি</th>
              <th className="text-right font-medium">প্রিসিশন</th>
              <th className="text-right font-medium">রিকল</th>
              <th className="text-right font-medium">F1</th>
              <th className="text-right font-medium">আস্থা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C293D]/50">
            {CATEGORIES.map((c) => {
              const m = metrics[c.index];
              return (
                <tr key={c.id}>
                  <td className="py-1.5" style={{ color: c.color }}>{c.emoji} {c.name}</td>
                  <td className="text-right text-[#F0F6FC]">{toBn(m.precision.toFixed(2))}</td>
                  <td className="text-right text-[#F0F6FC]">{toBn(m.recall.toFixed(2))}</td>
                  <td className="text-right font-semibold" style={{ color: m.f1 > 0.9 ? '#22C55E' : m.f1 > 0.8 ? '#FACC15' : '#F43F5E' }}>
                    {toBn(m.f1.toFixed(2))}
                  </td>
                  <td className="text-right text-[#8B9EB7]">{bnPct(m.avgConf * 100, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Keywords */}
      <section className="rounded-lg bg-[#0E1522] border border-[#1C293D] p-4">
        <h2 className="flex items-center gap-2 font-display font-bold text-[#F0F6FC] mb-2">
          <Hash className="w-4 h-4 text-[#EC4899]" /> AI শনাক্তকৃত ট্রেন্ডিং কীওয়ার্ড
        </h2>
        <div className="space-y-1">
          {keywords.map(([k, v], i) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-[#4A5D75]">{toBn(i + 1)}</span>
              <span className="font-semibold w-28 truncate" style={{ color: CATEGORIES[v.cat].color }}>#{k}</span>
              <div className="flex-1 h-1.5 bg-[#070B12] rounded overflow-hidden">
                <div className="h-full" style={{ width: `${(v.n / keywords[0][1].n) * 100}%`, background: CATEGORIES[v.cat].color }} />
              </div>
              <span className="text-[#F0F6FC] w-10 text-right">{bnNum(v.n)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
