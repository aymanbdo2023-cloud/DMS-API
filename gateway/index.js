const express = require("express");
require("dotenv").config();
const axios = require("axios");

const app = express();
const PORT = process.env.APP_PORT;

app.get("/", (req, res) => {
  res.json({
    message: "API Gateway is running",
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
});
