const express = require("express");
require("dotenv").config();
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
const PORT = process.env.APP_PORT;
const API_KEY = process.env.API_KEY;

const USER_AUTH_URL = process.env.USER_AUTH_URL;
const DOCUMENT_SERVICE_URL =
  process.env.DOCUMENT_SERVICE_URL || "http://document-service:3002";
const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:3004";

const loggingMiddleware = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
};

// Middlewares
app.use(loggingMiddleware);
app.use(cors());
// app.use(apiKeyMiddleware);

app.use(
  createProxyMiddleware({
    target: USER_AUTH_URL,
    changeOrigin: true,
    pathFilter: "/auth",
  }),
);

app.use(
  createProxyMiddleware({
    target: DOCUMENT_SERVICE_URL,
    changeOrigin: true,
    pathFilter: ["/upload", "/inbox", "/download", "/health"],
  }),
);

app.use(
  createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    pathFilter: "/notifications",
  }),
);

app.get("/", (req, res) => {
  res.json({
    message: "API Gateway is running",
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
});
