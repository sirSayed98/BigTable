const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const errorHandler = require("./middleware/error");

// Load env vars
dotenv.config({ path: "./config/.env" });

const PORT = process.env.TABLET_SERVER_TWO_PORT || 3000;
const app = express();

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// Body parser
app.use(express.json());

// load Routers
const MoviesRouter = require("./routes/MovieTabletServer2");
const ClientRouter = require("./routes/Tablet2ClientRouter");

//mount routes
app.use("/Movies/Tablet", MoviesRouter);
app.use("/movie/client/tabletServer2", ClientRouter);

// errorHandler
app.use(errorHandler);

const server = app.listen(
  PORT,
  console.log(`Tablet Server2 running on port ${PORT}`)
);



// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
