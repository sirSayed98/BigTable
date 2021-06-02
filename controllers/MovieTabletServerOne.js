const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
const { connectToDB } = require("../config/MovieTabletServerConnect");
dotenv.config({ path: "../config/.env" });

const Socket = io.connect(process.env.MASTER_SERVER_HOST);

let MovieTablet1 = connectToDB(process.env.TABLET_SERVER_ONE_ONE_CONN, 1);
let MovieTablet2 = connectToDB(process.env.TABLET_SERVER_ONE_TWO_CONN, 2);

Socket.on("connect", function (so) {
  console.log(
    "[TABLET] Tablet Server1 has been connected to the master server!"
  );
  //TODO:reorder
});

//send Status of TabletServer to Master Server
Socket.emit("status", {
  tabletCount: process.env.TABLET_SERVER_ONE_TABLETS * 1,
});
Socket.on("recieveData", async function (data) {
  const step = data.length / 2;
  let part1 = data.slice(0, step);
  let part2 = data.slice(step, data.length);

  setTimeout(async () => {
    await MovieTablet1.db.collection("Movie").deleteMany();
    await MovieTablet2.db.collection("Movie").deleteMany();
    await MovieTablet1.db.collection("Movie").insertMany(part1);
    await MovieTablet2.db.collection("Movie").insertMany(part2);
  }, 5000);
});

exports.getMoviesMul = asyncHandler(async (req, res, next) => {
  const arr1 = await MovieTablet1.db.collection("Movie").find().toArray();
  const arr2 = await MovieTablet2.db.collection("Movie").find().toArray();

  const films = arr1.concat(arr2);

  res.status(200).json({
    success: true,
    count: films.length,
    data: films,
  });
});

exports.getMoviesTabletPartion = asyncHandler(async (req, res, next) => {
  let arr;
  if (req.params.id * 1 == 1) {
    arr = await MovieTablet1.db.collection("Movie").find().toArray();
  } else {
    arr = await MovieTablet2.db.collection("Movie").find().toArray();
  }

  res.status(200).json({
    success: true,
    count: arr.length,
    data: arr,
  });

});
