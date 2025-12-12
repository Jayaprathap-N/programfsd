const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection pool - change credentials to match your setup
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'system',
  database: 'eventdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper: query wrapper
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/* ---------- ROUTES ---------- */

// Create: POST /api/events
app.post('/api/events', async (req, res) => {
  try {
    const {
      name,
      description,
      date,
      time,
      location,
      organizer_name,
      organizer_email
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    const sql = `INSERT INTO events (name, description, date, time, location, organizer_name, organizer_email)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const result = await query(sql, [
      name,
      description || null,
      date || null,
      time || null,
      location || null,
      organizer_name || null,
      organizer_email || null
    ]);

    const inserted = await query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.status(201).json({ event: inserted[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Read all: GET /api/events
app.get('/api/events', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM events ORDER BY date ASC, time ASC', []);
    res.json({ events: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Read one: GET /api/events/:id
app.get('/api/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT * FROM events WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json({ event: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Update: PUT /api/events/:id
app.put('/api/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      name,
      description,
      date,
      time,
      location,
      organizer_name,
      organizer_email
    } = req.body;

    // Minimal validation
    if (!name) return res.status(400).json({ error: 'Event name is required' });

    const sql = `UPDATE events SET
                   name = ?,
                   description = ?,
                   date = ?,
                   time = ?,
                   location = ?,
                   organizer_name = ?,
                   organizer_email = ?
                 WHERE id = ?`;

    const result = await query(sql, [
      name,
      description || null,
      date || null,
      time || null,
      location || null,
      organizer_name || null,
      organizer_email || null,
      id
    ]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Event not found' });

    const updated = await query('SELECT * FROM events WHERE id = ?', [id]);
    res.json({ event: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete: DELETE /api/events/:id
app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await query('DELETE FROM events WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Serve index.html as fallback (optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
