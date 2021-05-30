const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
const { connectToDB } = require("../config/MovieTabletServerConnect");
dotenv.config({ path: "../config/.env" });

const Socket = io.connect(process.env.MASTER_SERVER_HOST);

const MovieTablet3 = connectToDB(process.env.TABLET_SERVER_TWO_ONE_CONN, 3);
const MovieTablet4 = connectToDB(process.env.TABLET_SERVER_TWO_TWO_CONN, 4);

Socket.on("connect", function (so) {
  console.log(
    "[TABLET] Tablet Server2 has been connected to the master server!"
  );
});

Socket.emit("status", {
  tabletCount: process.env.TABLET_SERVER_TWO_TABLETS * 1,
});

Socket.on("recieveData", function (data) {
  const step = data.length / 2;
  let part1 = data.slice(0, step);
  let part2 = data.slice(step, data.length);

  setTimeout(async () => {
    await MovieTablet3.db.collection("Movie").deleteMany();
    await MovieTablet4.db.collection("Movie").deleteMany();
    await MovieTablet3.db.collection("Movie").insertMany(part1);
    await MovieTablet4.db.collection("Movie").insertMany(part2);
  }, 5000);

});

exports.getMoviesTabletServer2 = asyncHandler(async (req, res, next) => {
  const arr1 = await MovieTablet3.db.collection("Movie").find().toArray();
  const arr2 = await MovieTablet4.db.collection("Movie").find().toArray();

  const films = arr1.concat(arr2);

  res.status(200).json({
    success: true,
    data: films,
  });
});
