const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const Socket = require("socket.io");
// Load env vars
dotenv.config({ path: "./config/.env" });

const PORT = process.env.PORT || 5000;
const app = express();

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Connect to database
connectDB(process.env.MONGO_URI);

// load Routers
const Movies = require("./routes/Movie");

//mount routes
app.use("/Movies", Movies);

// errorHandler
app.use(errorHandler);

const server = app.listen(
  PORT,
  console.log(`Master Server running on port ${PORT}`)
);
const io = Socket(server);

//_______________________________SOCKET____________________________________

const { configuration } = require("./controllers/MovieMaster");

const onConnection = (socket) => {
  configuration(socket);
};

io.on("connection", onConnection);

io.on("disconnect", function (socket) {
  tabletServerCounter--;

  console.log(
    `[SERVER] one of tablet servers has been disconnceted #tabletServers=${tabletServerCounter}`
  );
});
//________________________________________________________________

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
