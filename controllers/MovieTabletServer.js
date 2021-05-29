const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
dotenv.config({ path: "../config/.env" });



const socket = io.connect(process.env.MASTER_SERVER_HOST);


const MovieTablet1 = require("../models/TabletServer1.1");
const MovieTablet2 = require("../models/TabletServer1.2");

socket.on("connect", function (socket) {
  console.log("Tablet Server1 has been connected!");
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
