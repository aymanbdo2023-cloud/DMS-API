const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3002;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "dms_user",
  password: process.env.DB_PASSWORD || "dms_password",
  database: process.env.DB_NAME || "dms_db",
});

app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "document-service", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", service: "document-service", db: "disconnected" });
  }
});

app.listen(PORT, () => console.log(`Document service running on port ${PORT}`));
