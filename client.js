const express = require("express");
const io = require("socket.io-client");
const dotenv = require("dotenv");

// Load env vars
dotenv.config({ path: "./config/.env" });

const { configure } = require("./controllers/clientController");
const Socket = io.connect(process.env.MASTER_SERVER_HOST);

const PORT = process.env.CLIENT_ONE_PORT || 7000;
const app = express();


Socket.on("connect", function (co) {
  console.log("[client] a new client is connected to master");
  configure(Socket);
});

const server = app.listen(
  PORT,
  console.log(`Client running on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
