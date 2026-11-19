import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- LENIS ---------- */
const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ---------- CURSOR ---------- */
const cursor = $('[data-cursor]');
let mx = 0, my = 0, cx = 0, cy = 0;
window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
function cursorLoop() {
  cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
  cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
  requestAnimationFrame(cursorLoop);
}
cursorLoop();
$$('a,button,select,input,.magnetic').forEach((el) => {
  el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
});

/* ---------- MAGNETIC ---------- */
$$('.magnetic').forEach((el) => {
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    gsap.to(el, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
  });
  el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' }));
});

/* ---------- PRELOADER ---------- */
const preloader = $('[data-preloader]');
const preloadNum = $('[data-preload-num]');
let p = 0;
const preloadTimer = setInterval(() => {
  p = Math.min(100, p + Math.random() * 14);
  preloadNum.textContent = String(Math.floor(p)).padStart(3, '0');
  if (p >= 100) {
    clearInterval(preloadTimer);
    preloadNum.textContent = '100';
    setTimeout(() => preloader.classList.add('is-done'), 300);
  }
}, 90);

/* ---------- CLOCK ---------- */
const clockEl = $('[data-clock]');
function tickClock() {
  const d = new Date();
  clockEl.textContent = d.toLocaleTimeString('en-GB', { hour12: false });
}
setInterval(tickClock, 1000); tickClock();

/* ---------- PULSE CANVAS (hero signature) ---------- */
const canvas = $('[data-pulse-canvas]');
const ctx = canvas.getContext('2d');
let W, H, dpr;
function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// pulse line state
const pulses = [];
let baseLineY;
function drawPulse() {
  ctx.clearRect(0, 0, W, H);
  baseLineY = H * 0.55;
  // grid
  ctx.strokeStyle = 'rgba(245,241,232,0.06)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // base line
  ctx.strokeStyle = 'rgba(216,243,74,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let x = 0;
  ctx.moveTo(0, baseLineY);
  while (x < W) { x += 6; ctx.lineTo(x, baseLineY + Math.sin(x * 0.02 + performance.now() * 0.002) * 3); }
  ctx.stroke();
  // pulses (spikes)
  pulses.forEach((pl) => {
    pl.t += 0.012;
    if (pl.t > 1) return;
    const px = pl.startX + (W - pl.startX) * pl.t;
    const amp = (1 - pl.t) * 60;
    ctx.strokeStyle = `rgba(216,243,74,${1 - pl.t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 40, baseLineY);
    ctx.lineTo(px - 20, baseLineY - amp);
    ctx.lineTo(px, baseLineY + amp * 0.4);
    ctx.lineTo(px + 20, baseLineY - amp * 0.6);
    ctx.lineTo(px + 40, baseLineY);
    ctx.stroke();
    // glow
    ctx.shadowColor = '#d8f34a'; ctx.shadowBlur = 12;
    ctx.stroke(); ctx.shadowBlur = 0;
  });
  for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i].t > 1) pulses.splice(i, 1);
  requestAnimationFrame(drawPulse);
}
drawPulse();

function firePulse() { pulses.push({ t: 0, startX: 0 }); }

/* ---------- API ---------- */
const api = async (path, opts) => {
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

/* ---------- STATE ---------- */
let employees = [];
let selectedEmp = null;

async function loadEmployees() {
  employees = await api('/api/employees');
  const sel = $('[data-emp-select]');
  sel.innerHTML = employees.map((e) => `<option value="${e.id}">${e.name} — ${e.department}</option>`).join('');
  if (employees.length) selectedEmp = employees[0].id;
  sel.value = selectedEmp;
  sel.addEventListener('change', () => { selectedEmp = Number(sel.value); });
}

async function loadStats() {
  const s = await api('/api/stats');
  $('[data-stat-value="present"]').textContent = s.present;
  $('[data-stat-value="late"]').textContent = s.late;
  $('[data-stat-value="remote"]').textContent = s.remote;
  $('[data-stat-value="absent"]').textContent = s.absent;
  $('[data-live-count]').textContent = s.present;
  // day ring
  const pct = s.total ? (s.present + s.remote) / s.total : 0;
  const circ = 2 * Math.PI * 86;
  const ring = $('[data-day-ring]');
  ring.style.strokeDashoffset = circ * (1 - pct);
  $('[data-day-pct]').textContent = Math.round(pct * 100) + '%';
  // trend bars
  const bars = $('[data-trend-bars]');
  bars.innerHTML = '';
  const max = Math.max(1, ...s.trend.map((t) => t.c));
  s.trend.forEach((t) => {
    const b = document.createElement('div');
    b.className = 'trend__bar';
    b.style.height = (t.c / max * 100) + '%';
    b.setAttribute('data-v', t.c);
    b.title = t.d;
    bars.appendChild(b);
  });
  // animate stat counters
  $$('.stat').forEach((el) => el.classList.add('is-in'));
}

async function loadRoster() {
  const { rows } = await api('/api/attendance');
  const list = $('[data-roster]');
  list.innerHTML = rows.map((r) => {
    const initials = r.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
    const inT = r.check_in ? new Date(r.check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
    const outT = r.check_out ? new Date(r.check_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
    return `<li class="roster__item">
      <div class="roster__avatar" style="background:${r.avatar_color}">${initials}</div>
      <div>
        <div class="roster__name">${r.name}</div>
        <div class="roster__dept">${r.department}</div>
      </div>
      <div class="roster__time">${inT} → ${outT}</div>
      <span class="roster__status ${r.status}">${r.status}</span>
    </li>`;
  }).join('');
}

async function loadRecords(date) {
  const { rows } = await api('/api/attendance?date=' + date);
  const body = $('[data-records-body]');
  body.innerHTML = rows.map((r) => {
    const inT = r.check_in ? new Date(r.check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
    const outT = r.check_out ? new Date(r.check_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
    return `<tr>
      <td>${r.name}</td><td>${r.department}</td>
      <td>${inT}</td><td>${outT}</td>
      <td><span class="roster__status ${r.status}">${r.status}</span></td>
    </tr>`;
  }).join('');
}

async function refreshAll() {
  await Promise.all([loadStats(), loadRoster()]);
  const d = $('[data-rec-date]').value || new Date().toISOString().slice(0, 10);
  await loadRecords(d);
}

/* ---------- CHECKIN ACTIONS ---------- */
$('[data-checkin-btn]').addEventListener('click', async () => {
  const msg = $('[data-checkin-msg]');
  try {
    const r = await api('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: selectedEmp }) });
    msg.textContent = `Checked in — ${r.status}.`;
    firePulse();
    await refreshAll();
  } catch (e) { msg.textContent = 'Error: ' + e.message; }
});
$('[data-checkout-btn]').addEventListener('click', async () => {
  const msg = $('[data-checkin-msg]');
  try {
    await api('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: selectedEmp }) });
    msg.textContent = 'Checked out. See you tomorrow.';
    await refreshAll();
  } catch (e) { msg.textContent = 'Error: ' + e.message; }
});
$('[data-remote-btn]').addEventListener('click', async () => {
  const msg = $('[data-checkin-msg]');
  try {
    await api('/api/remote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: selectedEmp }) });
    msg.textContent = 'Marked remote.';
    await refreshAll();
  } catch (e) { msg.textContent = 'Error: ' + e.message; }
});

$('[data-rec-date]').addEventListener('change', (e) => loadRecords(e.target.value));

/* ---------- GSAP REVEALS ---------- */
window.addEventListener('load', () => {
  // split titles
  $$('[data-split]').forEach((el) => {
    // simple word/line reveal via clip
    gsap.fromTo(el, { yPercent: 110, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
  $$('[data-reveal]').forEach((el, i) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: i * 0.05,
      scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('[data-stagger] > *').forEach((el, i) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: i * 0.08,
      scrollTrigger: { trigger: el.parentElement, start: 'top 85%' } });
  });
});

/* ---------- INIT ---------- */
(async function init() {
  await loadEmployees();
  await refreshAll();
  // set default date input
  $('[data-rec-date]').value = new Date().toISOString().slice(0, 10);
})();
