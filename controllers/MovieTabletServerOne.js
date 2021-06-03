const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
const { connectToDB } = require("../config/MovieTabletServerConnect");

const Socket = io.connect(process.env.MASTER_SERVER_HOST);
let MovieTablet2 = connectToDB(process.env.TABLET_SERVER_ONE_TWO_CONN, 2);
let MovieTablet1 = connectToDB(process.env.TABLET_SERVER_ONE_ONE_CONN, 1);

dotenv.config({ path: "../config/.env" });

let metaTable = {};
let DeletedVector = [[], []];

Socket.on("connect", function (so) {
  console.log(
    "[TABLET] Tablet Server1 has been connected to the master server!"
  );
});

//send Status of TabletServer to Master Server
Socket.emit("status", {
  tabletCount: process.env.TABLET_SERVER_ONE_TABLETS * 1,
});
Socket.on("metaTable", async function (data) {
  metaTable = data;
  console.log(`[TABLET] received metatable `);
  console.log(metaTable);
});

Socket.on("recieveData", async function (data) {
  const step = data.length / 2;
  let part1 = data.slice(0, step);
  let part2 = data.slice(step, data.length);

  let tablets = [{}, {}];

  tablets[0].startID = metaTable.dataStartID;
  tablets[0].endID = tablets[0].startID + part1.length - 1;
  tablets[0].ID = 1;

  tablets[1].startID = tablets[0].endID + 1;
  tablets[1].endID = tablets[1].startID + part2.length - 1;
  tablets[1].ID = 2;

  metaTable.tablets = tablets;
  console.log("________end________");
  console.log(metaTable);

  setTimeout(async () => {
    await MovieTablet1.db.collection("Movie").deleteMany();
    await MovieTablet2.db.collection("Movie").deleteMany();
    await MovieTablet1.db.collection("Movie").insertMany(part1);
    await MovieTablet2.db.collection("Movie").insertMany(part2);
  }, 5000);
});

Socket.on("reBalance", async function (data) {
  console.log(`[TABLET] change Data end ID`);
  let newEnd = data.dataEndID;
  let index = newEnd + 1;

  for (let i = index; i <= metaTable.dataEndID; i++) {
    await MovieTablet4.db.collection("Movie").deleteOne({ id: index });
    console.log(`[TABLET] remove row:${index} from Tablet`);
  }
  
  Socket.emit("sendDeletedVector", { vector: DeletedVector[1] });

  //remove from table
  DeletedVector[1].splice(0, DeletedVector[1].length);
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

exports.deleteMovieByID = asyncHandler(async (req, res, next) => {
  let id = req.params.id * 1;
  let tabletID = req.params.tabletID * 1;

  var t1StartID = metaTable.tablets[0].startID;
  var t1EndID = metaTable.tablets[0].endID;

  var t2StartID = metaTable.tablets[1].startID;
  var t2EndID = metaTable.tablets[1].endID;

  if (
    (tabletID == 1 && !(t1StartID <= id && id <= t1EndID)) ||
    (tabletID == 2 && !(t2StartID <= id && id <= t2EndID))
  ) {
    return res.status(404).json({
      success: false,
      Message: `this id:${id} is not available in this tablet`,
    });
  }

  //prevent 2 delete
  if (DeletedVector[0].includes(id) || DeletedVector[1].includes(id)) {
    return res.status(404).json({
      success: false,
      Message: `this id: ${id} already deleted`,
    });
  }

  DeletedVector[tabletID - 1].push(id * 1);

  var Len1 = DeletedVector[0].length;
  var Len2 = DeletedVector[1].length;

  const movie =
    tabletID == 1
      ? await MovieTablet1.db
          .collection("Movie")
          .update({ id: id }, { $set: { deleted: true } }, { upsert: false })
      : await MovieTablet2.db
          .collection("Movie")
          .update({ id: id }, { $set: { deleted: true } }, { upsert: false });

  // if (2(Len1 + Len2) >= metaTable.numOfrows) {
  // }

  if (2 * (Len1 + Len2) >= 10) {

    //reorder
    DeletedVector[0].sort(function (a, b) {
      return a - b;
    });
    DeletedVector[1].sort(function (a, b) {
      return a - b;
    });
    Socket.emit("lazyDelete", {
      DeletedVector,
      tabletID,
      tabletServer: metaTable.tabletServerID,
    });
    console.log(`[TABLET] Send Deleted Vector to Master`);
    return res.status(200).json({
      success: true,
      data: DeletedVector,
    });
  }

  res.status(200).json({
    success: true,
    data: DeletedVector,
  });


});
