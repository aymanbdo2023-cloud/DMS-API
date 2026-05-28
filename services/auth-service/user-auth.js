const express = require("express");
const cors = require("cors");
const { responseInterceptor } = require("http-proxy-middleware");
require("dotenv").config();
const { Pool } = require("pg");

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

const pool = new Pool({
  host: process.env.DB_HOST || "host.docker.internal",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "dms_password",
  database: process.env.DB_NAME || "dms",
});

app.use(cors());
app.use(express.json());

app.get("/auth", async (req, res) => {
  const { username, passw } = req.query;
  const result = await authUser(username, passw);

  if (result.length == 0) {
    res.json({ error: "No users found!" });
  } else {
    res.status(200).json({
      result,
    });
  }
});

app.get("/auth/getAll", async (req, res) => {
  users = await pool.query("SELECT * from users;");
  res.status(200).json(users.rows);
});

app.post("/auth/registerUser", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const nameTaken = await checkExistingUser(username);

  if (nameTaken) {
    res.status(409).json({ message: "Username already taken!" });
  } else {
    const addNewUser = await createNewUser(username, password);
    if (!addNewUser) {
      return res.status(500).json({ message: "An Unexpected error occured!" });
    }
    res.status(201).json({ message: "Account created successfully" });
  }

});

app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));

async function getAllUsers() {
  const allUsers = await pool.query("SELECT * FROM users;");
  return allUsers.rows;
}

async function authUser(username, password) {
  const user = await pool.query(
    `select id, username, password from users where username='${username}' and password='${password}'`,
  );

  return user.rows;
}

async function checkExistingUser(username) {
  const users = await pool.query(
    `select id from users where username='${username}'`,
  );

  const data = users.rows;

  if (data.length == 0) {
    return false;
  }
  return true;
}

async function createNewUser(username, password) {
  try {
    const db = await pool.query(
      `insert into users (username, password) values ('${username}', '${password}')`,
    );
    return true;
  } catch (err) {
    return false;
  }
}
