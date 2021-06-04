const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const errorHandler = require("./middleware/error");

const { E_CANCELED } = require("async-mutex");
const Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();

var sleep = require("system-sleep");

// Load env vars
dotenv.config({ path: "./config/.env" });

const PORT = process.env.TABLET_SERVER_ONE_PORT || 4000;
const app = express();

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// Body parser
app.use(express.json());

// load Routers
const MoviesRouter = require("./routes/MovieTabletServer1");

//mount routes
app.use("/", (req, res, next) => {
  if (req.method === "DELETE" || req.method === "PUT") {
    mutex
      .runExclusive(() => {
        console.log("[TABLET] acquire lock");
        //sleep(15000); // 15 seconds
        next();
      })
      .then(() => {
        console.log("[TABLET] Release lock");
      })
      .catch((e) => {
        if (e === E_CANCELED) {
          console.log("[TABLET] got blocked");
        }
      });
  } else if (!mutex.isLocked()) {
    next();
  } else {
    res.status(404).json({ message: "you are blocked" });
  }
});

app.use("/Movies/Tablet", MoviesRouter);

// errorHandler
app.use(errorHandler);

const server = app.listen(
  PORT,
  console.log(`Tablet Server1 running on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
