const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3004;

const pool = new Pool({
  host: process.env.DB_HOST || "host.docker.internal",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "aycas2009",
  database: process.env.DB_NAME || "dms",
});

app.use(cors());
app.use(express.json());

app.get("/notifications", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const result = await pool.query(
      `SELECT id, userId, message, documentId, read, created_at
       FROM notifications
       WHERE userId = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.get("/notifications/unread-count", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE userId = $1 AND NOT read`,
      [userId],
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

app.put("/notifications/read-all", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    await pool.query(
      `UPDATE notifications SET read = true WHERE userId = $1 AND NOT read`,
      [userId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      service: "notification-service",
      db: "connected",
    });
  } catch {
    res
      .status(503)
      .json({
        status: "error",
        service: "notification-service",
        db: "disconnected",
      });
  }
});

app.listen(PORT, () =>
  console.log(`Notification service running on port ${PORT}`),
);
