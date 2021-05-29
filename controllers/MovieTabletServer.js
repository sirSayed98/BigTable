const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
dotenv.config({ path: "../config/.env" });

const Socket = io.connect(process.env.MASTER_SERVER_HOST);

const MovieTablet1 = require("../models/TabletServer1.1");
const MovieTablet2 = require("../models/TabletServer1.2");

Socket.on("connect", function (so) {
  console.log(
    "[TABLET] Tablet Server1 has been connected to the master server!"
  );
});

//send Status of TabletServer to Master Server
Socket.emit("status", {
  tabletCount: process.env.TABLET_SERVER_ONE_TABLETS * 1,
});

exports.getMoviesMul = asyncHandler(async (req, res, next) => {
  const arr1 = await MovieTablet1.db.collection("Movie").find().toArray();
  const arr2 = await MovieTablet2.db.collection("Movie").find().toArray();

  const films = arr1.concat(arr2);

  res.status(200).json({
    success: true,
    data: films,
  });
});
