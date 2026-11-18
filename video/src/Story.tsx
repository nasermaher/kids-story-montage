import React from 'react';
import {AbsoluteFill, Easing, continueRender, delayRender, interpolate, useCurrentFrame} from 'remotion';
import {CAIRO_B64} from './font';

export const FPS = 30;

// ---------- Fonts (embedded, no network) ----------
let fontReady = false;
const loadFont = () => {
  if (fontReady) return;
  const h = delayRender('font');
  let done = false;
  const fin = () => { if (!done) { done = true; fontReady = true; continueRender(h); } };
  setTimeout(fin, 4000);
  try {
    const f = new FontFace('Cairo', `url(data:font/woff2;base64,${CAIRO_B64})`, {weight: '700'});
    f.load().then((ff) => { (document as any).fonts.add(ff); fin(); }).catch(fin);
  } catch (e) { fin(); }
};

// ---------- Script (mirrors story/story_ar.md) ----------
type Scene = {d: number; lines: string[]};
const SCENES: Scene[] = [
  {d: 8, lines: ['في غرفةٍ دافئة، وجد ريّان صديقةً خشبية.', 'قالت: «أنا سورو. هل نلعب بالأرقام؟»']},
  {d: 7, lines: ['«ابدأ بالصفر»، قالت سورو.', '«لا خرزة تقترب. الصفر يعني: لا شيء».', 'ضحك ريّان: «فارغة!»']},
  {d: 5, lines: ['رفع ريّان خرزةً واحدة بإصبعه الصغير.', '«واحد!»']},
  {d: 5, lines: ['«واثنان!» رفع خرزةً ثانية.', 'تلألأت عينا سورو.']},
  {d: 6, lines: ['«ثلاثة… أنا أعدّ!»', 'قفز ريّان من الفرح.']},
  {d: 5, lines: ['«أربعة». صارت الخرزات الأربع قرب العارضة.', '«ممتاز!»']},
  {d: 7, lines: ['«الآن خرزةٌ جديدة في الأعلى. تساوي خمسة!»', 'أنزلها ريّان وحده.']},
  {d: 10, lines: ['أنزل ريّان الخرزة العليا ورفع أربعاً. «ستة؟»', 'هزّت سورو رأسها: «خرزةٌ واحدة فقط يا ريّان».', 'تنهّد ريّان وعبس قليلاً.']},
  {d: 8, lines: ['«حاول مرة أخرى، أنا هنا».', 'أنزل العليا ورفع خرزةً واحدة. «ستة!»']},
  {d: 10, lines: ['سبعة، ثم ثمانية، ثم تسعة.', 'كل مرة خرزةٌ أكثر. صار الأمر سهلاً.']},
  {d: 14, lines: ['«صفر، واحد، اثنان… تسعة!» عدّ ريّان وحده.', 'قالت سورو: «تعلّمتَ لأنك لم تتوقف».', 'ابتسم ريّان وغفا سعيداً.']},
];
const STARTS: number[] = [];
SCENES.reduce((a, s) => (STARTS.push(a), a + s.d), 0);
export const TOTAL_SECONDS = SCENES.reduce((a, s) => a + s.d, 0);

// digit changes: [seconds, digit | 'W' (the deliberate wrong "six")]
type Digit = number | 'W';
const CHANGES: [number, Digit][] = [
  [16.5, 1], [21.5, 2], [26.5, 3], [32, 4], [37.5, 5], [45, 'W'], [56, 6],
  [62.5, 7], [65, 8], [67.5, 9],
  ...Array.from({length: 10}, (_, k) => [73 + 0.9 * k, k] as [number, Digit]),
];
const HAND_UNTIL = 71; // hand helps only before the final solo count

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// ---------- Soroban geometry ----------
const RODS = [400, 550, 700, 850, 1000];
const BEAD_RX = 46;
const BEAD_RY = 26;
const H_ON = 442, H_OFF = 372;
const E_ON = (i: number) => 520 + 54 * i;
const E_OFF = (i: number) => 570 + 54 * i;

const stateOf = (d: Digit) => (d === 'W' ? {h: true, e: 4} : {h: d >= 5, e: d >= 5 ? d - 5 : d});

const ease = (x: number) => Easing.bezier(0.3, 0.0, 0.2, 1)(Math.min(1, Math.max(0, x)));
const MOVE = 0.6; // seconds a bead takes to slide

// position of one bead at time t (seconds), animated across all changes
const beadY = (t: number, on: (d: Digit) => boolean, yOn: number, yOff: number) => {
  let from = yOff, to = yOff, t0 = -99, cur = false;
  for (const [tc, d] of CHANGES) {
    if (tc > t) break;
    const want = on(d);
    if (want !== cur) {
      from = from + (to - from) * ease((tc - t0) / MOVE);
      to = want ? yOn : yOff;
      t0 = tc;
      cur = want;
    }
  }
  return from + (to - from) * ease((t - t0) / MOVE);
};

const digitAt = (t: number): Digit => {
  let d: Digit = 0;
  for (const [tc, v] of CHANGES) if (tc <= t) d = v;
  return d;
};

// ---------- Parts ----------
const Bead: React.FC<{x: number; y: number; active: boolean}> = ({x, y, active}) => (
  <g>
    <ellipse cx={x} cy={y} rx={BEAD_RX} ry={BEAD_RY} fill={active ? '#FFD66B' : '#FFFBF0'} stroke={active ? '#D99A1E' : '#CDB99A'} strokeWidth={4} />
    <ellipse cx={x - 14} cy={y - 8} rx={14} ry={6} fill="#fff" opacity={0.7} />
  </g>
);

const Soroban: React.FC<{t: number; blink: boolean; tilt: number; mood: string}> = ({t, blink, tilt, mood}) => (
  <g>
    <rect x={300} y={250} width={800} height={540} rx={28} fill="#B9774A" stroke="#7A4F2B" strokeWidth={6} />
    <rect x={330} y={340} width={740} height={420} fill="#FBEFD5" />
    {RODS.map((x) => <line key={x} x1={x} y1={340} x2={x} y2={760} stroke="#8A5A36" strokeWidth={9} strokeLinecap="round" />)}
    <rect x={330} y={470} width={740} height={22} fill="#7A4F2B" />
    {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={400 + i * 150} cy={481} r={4} fill="#E8CFA6" />)}
    {RODS.map((x, ri) => {
      const unit = ri === RODS.length - 1; // only the ones rod is used
      const hy = unit ? beadY(t, (d) => stateOf(d).h, H_ON, H_OFF) : H_OFF;
      const hActive = unit && stateOf(digitAt(t)).h;
      return (
        <g key={x}>
          <Bead x={x} y={hy} active={hActive} />
          {[0, 1, 2, 3].map((i) => {
            const y = unit ? beadY(t, (d) => stateOf(d).e > i, E_ON(i), E_OFF(i)) : E_OFF(i);
            const act = unit && stateOf(digitAt(t)).e > i;
            return <Bead key={i} x={x} y={y} active={act} />;
          })}
        </g>
      );
    })}
    {/* Soroo's face on the top bar */}
    <g transform={`rotate(${tilt} 700 295)`}>
      {[560, 840].map((x) =>
        mood === 'sleepy' ? <path key={x} d={`M${x - 20} 292 Q${x} 306 ${x + 20} 292`} stroke="#3B2A1A" strokeWidth={6} fill="none" strokeLinecap="round" />
        : <g key={x}>
            <ellipse cx={x} cy={290} rx={20} ry={blink ? 2 : 22} fill="#fff" />
            {!blink && <circle cx={x + 2} cy={292} r={10} fill="#3B2A1A" />}
          </g>)}
      <path d="M655 312 Q700 346 745 312" stroke="#3B2A1A" strokeWidth={7} fill="none" strokeLinecap="round" />
      <circle cx={600} cy={318} r={14} fill="#F29B8B" opacity={0.6} />
      <circle cx={800} cy={318} r={14} fill="#F29B8B" opacity={0.6} />
    </g>
    <rect x={300} y={760} width={800} height={30} fill="#9A6339" />
  </g>
);

const Rayyan: React.FC<{mood: string; jump: number; hand: {x: number; y: number}}> = ({mood, jump, hand}) => {
  const cx = 1500, cy = 520 + jump;
  const sh = {x: 1430, y: 690 + jump};
  const mouth =
    mood === 'sad' ? <path d={`M${cx - 26} ${cy + 72} Q${cx} ${cy + 50} ${cx + 26} ${cy + 72}`} stroke="#5A2E22" strokeWidth={7} fill="none" strokeLinecap="round" />
    : mood === 'curious' ? <ellipse cx={cx} cy={cy + 62} rx={14} ry={18} fill="#7A2E22" />
    : <path d={`M${cx - 34} ${cy + 52} Q${cx} ${cy + 92} ${cx + 34} ${cy + 52} Z`} fill="#7A2E22" stroke="#5A2E22" strokeWidth={5} strokeLinejoin="round" />;
  return (
    <g>
      <rect x={1390} y={620 + jump} width={220} height={260} rx={70} fill="#FFD23F" />
      <rect x={1480} y={600 + jump} width={40} height={40} fill="#E3A877" />
      {/* arm */}
      <line x1={sh.x} y1={sh.y} x2={hand.x} y2={hand.y + jump} stroke="#E3A877" strokeWidth={42} strokeLinecap="round" />
      <line x1={sh.x} y1={sh.y} x2={sh.x + (hand.x - sh.x) * 0.45} y2={sh.y + (hand.y + jump - sh.y) * 0.45} stroke="#FFD23F" strokeWidth={50} strokeLinecap="round" />
      <circle cx={hand.x} cy={hand.y + jump} r={27} fill="#E3A877" />
      {/* head */}
      <circle cx={cx - 98} cy={cy + 6} r={20} fill="#D8996A" />
      <circle cx={cx + 98} cy={cy + 6} r={20} fill="#D8996A" />
      {[-80, -50, -20, 10, 40, 70, 95].map((dx, i) => <circle key={i} cx={cx + dx * 0.95} cy={cy - 80 + Math.abs(dx) * 0.28 + (i % 2) * 8} r={36} fill="#5B3A29" />)}
      <circle cx={cx} cy={cy} r={98} fill="#E3A877" />
      {[-86, -62, -36, -10, 16, 42, 68, 88].map((dx, i) => <circle key={i} cx={cx + dx} cy={cy - 74 + (Math.abs(dx) > 60 ? 18 : 0) + (i % 2) * 6} r={30} fill="#5B3A29" />)}
      {mood === 'sleep' ? [-34, 34].map((x) => <path key={x} d={`M${cx + x - 16} ${cy - 2} Q${cx + x} ${cy + 12} ${cx + x + 16} ${cy - 2}`} stroke="#3B2A1A" strokeWidth={6} fill="none" strokeLinecap="round" />)
        : [-34, 34].map((x) => <g key={x}><ellipse cx={cx + x} cy={cy - 4} rx={13} ry={16} fill="#fff" /><circle cx={cx + x + (mood === 'sad' ? 0 : -3)} cy={cy + (mood === 'sad' ? 2 : -2)} r={8} fill="#3B2A1A" /></g>)}
      {mood === 'sad' && <>
        <path d={`M${cx - 52} ${cy - 30} L${cx - 18} ${cy - 40}`} stroke="#5B3A29" strokeWidth={6} strokeLinecap="round" />
        <path d={`M${cx + 52} ${cy - 30} L${cx + 18} ${cy - 40}`} stroke="#5B3A29" strokeWidth={6} strokeLinecap="round" />
      </>}
      <circle cx={cx - 58} cy={cy + 40} r={13} fill="#F29B8B" opacity={0.55} />
      <circle cx={cx + 58} cy={cy + 40} r={13} fill="#F29B8B" opacity={0.55} />
      {mouth}
    </g>
  );
};

// ---------- Main ----------
export const Story: React.FC = () => {
  React.useState(() => { loadFont(); return 0; });
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const idx = STARTS.findIndex((s, i) => t >= s && (i === STARTS.length - 1 || t < STARTS[i + 1]));
  const scene = SCENES[idx];
  const local = t - STARTS[idx];
  const per = scene.d / scene.lines.length;
  const li = Math.min(scene.lines.length - 1, Math.floor(local / per));
  const lt = local - li * per;
  const capOpacity = interpolate(lt, [0, 0.4, per - 0.35, per], [0, 1, 1, 0.0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const dusk = interpolate(t, [76, 84], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mood = t < 8 ? 'curious' : t >= 45 && t < 56 ? 'sad' : t >= 82 ? 'sleep' : 'happy';
  const rooMood = t >= 82 ? 'sleepy' : 'happy';
  const blink = frame % 120 > 114;
  const tilt = t >= 46 && t < 52 ? Math.sin((t - 46) * 5) * 4 : 0;
  const jump = t >= 27 && t < 29 ? -Math.abs(Math.sin((t - 27) * Math.PI * 2)) * 55 : 0;

  // hand reaches the bead that is about to move
  let hand = {x: 1330, y: 800};
  if (t < HAND_UNTIL) {
    for (const [tc, d] of CHANGES) {
      const p = t - tc;
      if (p < -0.8 || p > 2.0) continue;
      const s = stateOf(d);
      const ty = d === 'W' ? E_ON(3) : s.h && s.e === 0 ? H_ON : s.e > 0 ? E_ON(s.e - 1) : 700;
      const tx = 1075;
      const k = p < 0 ? ease((p + 0.8) / 0.8) : p < 1.2 ? 1 : 1 - ease((p - 1.2) / 0.8);
      hand = {x: 1330 + (tx - 1330) * k, y: 800 + (ty - 800) * k};
    }
  }

  const d = digitAt(t);
  const show = d === 'W' ? '؟' : AR[d];
  const wrong = d === 'W';
  const bubble = t >= 16;

  return (
    <AbsoluteFill style={{fontFamily: 'Cairo, DejaVu Sans, sans-serif'}}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix('#FFF1D2', '#5C4A7A', dusk)} />
            <stop offset="1" stopColor={mix('#FFD9A0', '#E89A6B', dusk)} />
          </linearGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#wall)" />
        {/* window with sun / moon */}
        <rect x={1560} y={90} width={260} height={230} rx={20} fill={mix('#BFE6FF', '#2B2D5B', dusk)} stroke="#B9774A" strokeWidth={10} />
        <circle cx={1690} cy={interpolate(dusk, [0, 1], [180, 150])} r={44} fill={mix('#FFE066', '#F6F1D5', dusk)} />
        <line x1={1690} y1={90} x2={1690} y2={320} stroke="#B9774A" strokeWidth={8} />
        {/* table */}
        <rect x={0} y={790} width={1920} height={290} fill="#A8683B" />
        <rect x={0} y={790} width={1920} height={26} fill="#C98A55" />
        <Rayyan mood={mood} jump={jump} hand={hand} />
        <Soroban t={t} blink={blink} tilt={tilt} mood={rooMood} />
        {/* big digit bubble */}
        {bubble && (
          <g>
            <circle cx={1230} cy={250} r={86} fill={wrong ? '#FFB199' : '#FFFFFF'} stroke={wrong ? '#E2553A' : '#F0A93A'} strokeWidth={8} />
            <text x={1230} y={290} textAnchor="middle" fontSize={120} fontWeight={700} fill={wrong ? '#B53A22' : '#2B4C7E'}>{show}</text>
          </g>
        )}
        {/* caption */}
        <rect x={140} y={850} width={1640} height={170} rx={36} fill="#FFF8E7" />
        <text x={960} y={960} textAnchor="middle" fontSize={58} fontWeight={700} fill="#3B2A1A" opacity={capOpacity} style={{direction: 'rtl', unicodeBidi: 'plaintext'}}>
          {scene.lines[li]}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

function mix(a: string, b: string, k: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}
