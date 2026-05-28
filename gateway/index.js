const express = require("express");
require("dotenv").config();
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();
const PORT = process.env.APP_PORT;
const API_KEY = process.env.API_KEY;

const USER_AUTH_URL = process.env.USER_AUTH_URL;

const loggingMiddleware = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
};

// const apiKeyMiddleware = (req, res, next) => {
//   const key = req.headers["api-key"];
//   if (!key || key != API_KEY) {
//     return res
//       .status(401)
//       .json({ error: "Unauthorized: missing or invalid API key" });
//   }
//   next();
// };

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

app.get("/", (req, res) => {
  res.json({
    message: "API Gateway is running",
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
});
