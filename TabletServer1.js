const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const errorHandler = require("./middleware/error");
//const connectMultiple = require("./config/multibleDb");

// Load env vars
dotenv.config({ path: "./config/.env" });

const PORT = process.env.TABLET_SERVER_ONE_PORT || 4000;
const app = express();

// Connect to database



//connectMultiple(process.env.TABLET_SERVER_ONE_CONN, "one");
//connectMultiple(process.env.TABLET_SERVER_ONE_ONE_CONN, "two");



// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// load Routers
const MoviesRouter = require("./routes/MovieMul");

//mount routes
app.use("/Movies/Tablet1", MoviesRouter);

// errorHandler
app.use(errorHandler);

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
