require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- helpers ---
const today = () => new Date().toISOString().slice(0, 10);

// employees
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY name');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// today's attendance (with employee info)
app.get('/api/attendance', async (req, res) => {
  const date = req.query.date || today();
  try {
    const [rows] = await pool.query(
      `SELECT a.*, e.name, e.department, e.avatar_color, e.role
       FROM attendance a JOIN employees e ON e.id=a.employee_id
       WHERE a.work_date=? ORDER BY a.check_in IS NULL, a.check_in`, [date]);
    res.json({ date, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// stats for a date
app.get('/api/stats', async (req, res) => {
  const date = req.query.date || today();
  try {
    const [tot] = await pool.query('SELECT COUNT(*) c FROM employees');
    const [agg] = await pool.query(
      `SELECT status, COUNT(*) c FROM attendance WHERE work_date=? GROUP BY status`, [date]);
    const map = Object.fromEntries(agg.map(r => [r.status, r.c]));
    const present = (map.present||0)+(map.late||0);
    const late = map.late||0;
    const remote = map.remote||0;
    const absent = (tot[0].c - present - remote);
    // last 7 days trend
    const [trend] = await pool.query(
      `SELECT work_date d, COUNT(*) c FROM attendance WHERE work_date >= DATE_SUB(?, INTERVAL 6 DAY) GROUP BY work_date ORDER BY work_date`, [date]);
    res.json({ total: tot[0].c, present, late, remote, absent, trend });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// check in
app.post('/api/checkin', async (req, res) => {
  const { employee_id, note } = req.body || {};
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const d = today();
  const now = new Date();
  // determine late: after 09:00
  const late = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
  const status = late ? 'late' : 'present';
  try {
    await pool.query(
      `INSERT INTO attendance (employee_id, work_date, check_in, status, note)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE check_in=VALUES(check_in), status=VALUES(status), note=VALUES(note)`,
      [employee_id, d, now, status, note || null]);
    res.json({ ok: true, status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// check out
app.post('/api/checkout', async (req, res) => {
  const { employee_id } = req.body || {};
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  const d = today();
  try {
    await pool.query(
      `UPDATE attendance SET check_out=? WHERE employee_id=? AND work_date=?`,
      [new Date(), employee_id, d]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// toggle remote
app.post('/api/remote', async (req, res) => {
  const { employee_id } = req.body || {};
  const d = today();
  try {
    await pool.query(
      `INSERT INTO attendance (employee_id, work_date, status) VALUES (?,?, 'remote')
       ON DUPLICATE KEY UPDATE status='remote', check_in=NULL, check_out=NULL`,
      [employee_id, d]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// mark absent
app.post('/api/absent', async (req, res) => {
  const { employee_id } = req.body || {};
  const d = today();
  try {
    await pool.query(
      `INSERT INTO attendance (employee_id, work_date, status) VALUES (?,?, 'absent')
       ON DUPLICATE KEY UPDATE status='absent'`, [employee_id, d]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`attendance-awwwards listening on http://localhost:${PORT}`));
