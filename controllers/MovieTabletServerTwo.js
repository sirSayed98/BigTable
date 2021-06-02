const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
const { connectToDB } = require("../config/MovieTabletServerConnect");
dotenv.config({ path: "../config/.env" });

const Socket = io.connect(process.env.MASTER_SERVER_HOST);
const MovieTablet3 = connectToDB(process.env.TABLET_SERVER_TWO_ONE_CONN, 3);
const MovieTablet4 = connectToDB(process.env.TABLET_SERVER_TWO_TWO_CONN, 4);

let metaTable = {};
let DeletedVector = [[], []];

Socket.on("connect", function (so) {
  console.log(
    "[TABLET] Tablet Server2 has been connected to the master server!"
  );
});

Socket.emit("status", {
  tabletCount: process.env.TABLET_SERVER_TWO_TABLETS * 1,
});

Socket.on("metaTable", async function (data) {
  metaTable = data;
  console.log(`[TABLET] received metatable `);
  console.log(metaTable);
});

Socket.on("recieveData", function (data) {
  const step = data.length / 2;
  let part1 = data.slice(0, step);
  let part2 = data.slice(step, data.length);

  let tablets = [{}, {}];

  console.log("________end________");
  console.log(metaTable);
  
  tablets[0].startID = metaTable.dataStartID;
  tablets[0].endID = tablets[0].startID + part1.length - 1;
  tablets[0].ID = 3;

  tablets[1].startID = tablets[0].endID + 1;
  tablets[1].endID = tablets[1].startID + part2.length - 1;
  tablets[1].ID = 4;

  metaTable.tablets = tablets;
  console.log("________end________");
  console.log(metaTable);

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
    count: films.length,
    data: films,
  });
});

exports.getMoviesTabletPartion = asyncHandler(async (req, res, next) => {
  let arr;
  if (req.params.id * 1 == 1) {
    arr = await MovieTablet3.db.collection("Movie").find().toArray();
  } else {
    arr = await MovieTablet4.db.collection("Movie").find().toArray();
  }

  res.status(200).json({
    success: true,
    count: arr.length,
    data: arr,
  });

});

exports.deleteMovieByID = asyncHandler(async (req, res, next) => {
  let id = req.params.id * 1;
  let tabletID = req.params.tabletID * 1;

  var t1StartID = metaTable.tablets[0].startID;
  var t1EndID = metaTable.tablets[0].endID;

  var t2StartID = metaTable.tablets[1].startID;
  var t2EndID = metaTable.tablets[1].endID;

  if (
    (tabletID == 3 && !(t1StartID <= id && id <= t1EndID)) ||
    (tabletID == 4 && !(t2StartID <= id && id <= t2EndID))
  ) {
    return res.status(404).json({
      success: false,
      Message: `this id:${id} is not available in this tablet`,
    });
  }

  DeletedVector[tabletID - 3].push(id * 1);
  console.log("_____________________");
  console.log(DeletedVector);

  if (DeletedVector[tabletID - 3].length == process.env.LAZY_DELETE * 1) {
    Socket.emit("lazyDelete", {
      DeletedVector,
      id: tabletID,
    });
    console.log(`[TABLET] Send Deleted Vector to Master`);
   return  res.status(200).json({
      success: true,
      data: DeletedVector,
    });
  }
  res.status(200).json({
    success: true,
    data: DeletedVector,
  });

});