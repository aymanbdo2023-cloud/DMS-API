const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const { Upload } = require("@aws-sdk/lib-storage");
const multer = require("multer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

const pool = new Pool({
  host: process.env.DB_HOST || "host.docker.internal",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "dms_password",
  database: process.env.DB_NAME || "dms",
});

const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.MINIO_BUCKET || "dms-files";
const uploadMiddleware = multer({ storage: multer.memoryStorage() }).single(
  "file",
);

app.use(cors());
app.use(express.json());

async function ensureBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch (err) {
    if (err.name === "NotFound" || err.name === "NoSuchBucket") {
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));
    } else {
      throw err;
    }
  }
}

app.post("/upload", uploadMiddleware, async (req, res) => {
  try {
    const file = req.file;
    const { ownerId, title, recipient } = req.body;

    if (!file || !ownerId || !title) {
      return res.status(400).json({ error: "Missing file, ownerId, or title" });
    }

    let receiverId = null;
    if (recipient) {
      const userResult = await pool.query(
        `SELECT id FROM users WHERE username = $1`,
        [recipient],
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "Recipient user not found" });
      }
      receiverId = userResult.rows[0].id;
    }

    const docResult = await pool.query(
      `INSERT INTO documents (title, file_size, storage_path, ownerId) VALUES ($1, $2, $3, $4) RETURNING id`,
      [title, file.size, `documents/temp_${file.originalname}`, ownerId],
    );
    const docId = docResult.rows[0].id;
    const finalPath = `documents/${docId}_${file.originalname}`;

    await new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET,
        Key: finalPath,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    }).done();

    await pool.query(`UPDATE documents SET storage_path = $1 WHERE id = $2`, [
      finalPath,
      docId,
    ]);

    if (receiverId) {
      await pool.query(
        `INSERT INTO shares (documentId, senderId, receiverId) VALUES ($1, $2, $3)`,
        [docId, ownerId, receiverId],
      );

      const senderResult = await pool.query(
        `SELECT username FROM users WHERE id = $1`,
        [ownerId],
      );
      const senderName = senderResult.rows[0]?.username || "Someone";
      const message = `${senderName} sent you ${title}`;

      await pool.query(
        `INSERT INTO notifications (userId, message, documentId) VALUES ($1, $2, $3)`,
        [receiverId, message, docId],
      );
    }

    const doc = await pool.query(`SELECT * FROM documents WHERE id = $1`, [
      docId,
    ]);
    res.status(201).json(doc.rows[0]);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/inbox", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const result = await pool.query(
      `SELECT d.id, d.title, d.file_size, d.storage_path, d.ownerId, d.created_at,
              s.senderId, s.receiverId, u.username AS sender
       FROM shares s
       JOIN documents d ON s.documentId = d.id
       JOIN users u ON s.senderId = u.id
       WHERE s.receiverId = $1
       ORDER BY d.created_at DESC`,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Inbox error:", err);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

app.get("/download/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    const docResult = await pool.query(
      `SELECT * FROM documents WHERE id = $1`,
      [documentId],
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = docResult.rows[0];
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: doc.storage_path,
    });

    const s3Response = await s3Client.send(command);
    const filename = doc.storage_path.split("/").pop();

    res.setHeader(
      "Content-Type",
      s3Response.ContentType || "application/octet-stream",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    s3Response.Body.pipe(res);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// Recommended to have this so that we can easily test the connection with the database
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "document-service", db: "connected" });
  } catch {
    res.status(503).json({
      status: "error",
      service: "document-service",
      db: "disconnected",
    });
  }
});

async function start() {
  await ensureBucket();
  app.listen(PORT, () =>
    console.log(`Document service running on port ${PORT}`),
  );
}

start();
