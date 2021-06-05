const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
const { connectToDB } = require("../config/MovieTabletServerConnect");
const getTime = require("../utils/getTime");
dotenv.config({ path: "../config/.env" });

const Socket = io.connect(process.env.MASTER_SERVER_HOST);
let MovieTablet1 = connectToDB(process.env.TABLET_SERVER_ONE_ONE_CONN, 1);
let MovieTablet2 = connectToDB(process.env.TABLET_SERVER_ONE_TWO_CONN, 2);

let metaTable = {};
let DeletedVector = [[], []];

let editMovies = [];
let editIDs = [];

let createdVector1 = [];
let createdVector2 = [];

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
  //console.log(metaTable);
});

Socket.on("recieveData", async function (data) {
  const step = data.length / 2;
  let part1 = data.slice(0, step);
  let part2 = data.slice(step, data.length);

  let tablets = [{}, {}];

  tablets[0].startID = metaTable.dataStartID;
  tablets[0].endID = tablets[0].startID + part1.length - 1;
  tablets[0].ID = 1;
  tablets[0].numOfRows = part1.length;

  tablets[1].startID = tablets[0].endID + 1;
  tablets[1].endID = tablets[1].startID + part2.length - 1;
  tablets[1].ID = 2;
  tablets[1].numOfRows = part2.length;

  metaTable.endID = tablets[1].endID;
  metaTable.tablets = tablets;
  metaTable.tabletCapacity = process.env.TABLET_CAPACITY * 1;
  //console.log(metaTable);

  setTimeout(async () => {
    await MovieTablet1.db.collection("Movie").deleteMany();
    await MovieTablet2.db.collection("Movie").deleteMany();
    await MovieTablet1.db.collection("Movie").insertMany(part1);
    await MovieTablet2.db.collection("Movie").insertMany(part2);
  }, 5000);
});

Socket.on("reBalance", async function (data) {
  console.log(`[TABLET] Recieved re-balance request`);

  console.log(`[TABLET] Send Editied vector`);
  Socket.emit("lazyUpdate", {
    editMovies,
    editIDs,
  });

  console.log(`[TABLET] Send created Vector to Master`);
  Socket.emit("lazyCreate", {
    createdVector1,
    createdVector2,
  });

  console.log(`[TABLET] Send Deleted vector`);
  Socket.emit("deleteAndRebalance", { DeletedVector });

  //remove from table
  DeletedVector[0] = [];
  DeletedVector[1] = [];
  createdVector1 = [];
  createdVector2 = [];
  editMovies = [];
  editIDs = [];
});

exports.getMoviesTabletServer = asyncHandler(async (req, res, next) => {
  const arr1 = await MovieTablet1.db.collection("Movie").find().toArray();
  const arr2 = await MovieTablet2.db.collection("Movie").find().toArray();

  const films = arr1.concat(arr2);

  res.status(200).json({
    success: true,
    count: films.length,
    data: films,
  });
  next();
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
  next();
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

  let startIndex = editIDs.indexOf(id);

  if (startIndex !== -1) {
    editMovies.splice(startIndex, 1);
    editIDs.splice(startIndex, 1);
    console.log(`[TABLET] Remove ID: ${id} from edit lazy list`);
  }

  if (2 * (Len1 + Len2) >= metaTable.numOfrows) {
    //reorder
    DeletedVector[0].sort(function (a, b) {
      return a - b;
    });
    DeletedVector[1].sort(function (a, b) {
      return a - b;
    });

    console.log(
      `[TABLET] Send Updated vector to Master before delete and re-balance`
    );
    Socket.emit("lazyUpdate", {
      editMovies,
      editIDs,
    });

    editMovies = [];
    editIDs = [];

    console.log(`[TABLET] Send created Vector to Master`);
    Socket.emit("lazyCreate", {
      createdVector1,
      createdVector2,
    });

    createdVector1 = [];
    createdVector2 = [];

    console.log(`[TABLET] Send Deleted Vector to Master`);
    Socket.emit("lazyDelete", {
      DeletedVector,
      tabletID,
      tabletServer: metaTable.tabletServerID,
    });

    DeletedVector[0] = [];
    DeletedVector[1] = [];

    return res.status(200).json({
      success: true,
      data: DeletedVector,
    });
  }

  res.status(200).json({
    success: true,
    data: DeletedVector,
  });
  next();
});

exports.updateMovieByID = asyncHandler(async (req, res, next) => {
  let id = req.params.id * 1;

  var t1StartID = metaTable.tablets[0].startID;
  var t1EndID = metaTable.tablets[0].endID;

  var t2StartID = metaTable.tablets[1].startID;
  var t2EndID = metaTable.tablets[1].endID;

  var Tablet =
    t1StartID <= id && id <= t1EndID
      ? 1
      : t2StartID <= id && id <= t2EndID
      ? 2
      : 0;
  if (Tablet == 0) {
    return res.status(404).json({
      success: false,
      Message: `this id:${id} is not available in this tablet server`,
    });
  }

  const Movie =
    Tablet == 1
      ? await MovieTablet1.db
          .collection("Movie")
          .updateOne({ id: id }, { $set: req.body }, { upsert: false })
      : await MovieTablet2.db
          .collection("Movie")
          .updateOne({ id: id }, { $set: req.body }, { upsert: false });

  console.log(`[TABLET] update Movie id: ${id}`);

  editMovies.push(req.body);
  editIDs.push(id);
  res.status(200).json({ success: true, data: Movie });

  if (2 * editIDs.length >= metaTable.numOfrows) {
    console.log(`[TABLET] send edit vector to MASTER`);
    Socket.emit("lazyUpdate", {
      editMovies,
      editIDs,
    });
    editMovies = [];
    editIDs = [];
  }
  next();
});

exports.createMovie = asyncHandler(async (req, res, next) => {
  if (
    metaTable.tablets[0].length == metaTable.tabletCapacity &&
    metaTable.tablets[1].length == metaTable.tabletCapacity
  ) {
    console.log(`[MASTER] tablet server capacity is full `);
    return res
      .status(500)
      .json({ message: "Tablet server reached its capacity" });
  }

  let tablet = createdVector1.length <= createdVector2.length ? 1 : 2;

  console.log(`[TABLET] recieved post req from in tablet ${tablet}`);

  metaTable.endID += 1;

  req.body.id = metaTable.endID;
  req.body.createdAt = getTime();
  req.body.deleted = false;

  const Movie =
    tablet == 1
      ? await MovieTablet1.db.collection("Movie").insertOne(req.body)
      : await MovieTablet2.db.collection("Movie").insertOne(req.body);

  if (tablet == 1) {
    createdVector1.push(req.body);
  } else createdVector2.push(req.body);

  console.log(createdVector1);
  console.log(createdVector2);

  if (
    2 * (createdVector1.length + createdVector2.length) >=
    metaTable.numOfrows
  ) {
    //call reblance
    console.log(`[MASTER] exceed half capacity`);

    Socket.emit("lazyUpdate", {
      editMovies,
      editIDs,
    });

    editMovies = [];
    editIDs = [];

    Socket.emit("lazyCreate", {
      createdVector1,
      createdVector2,
    });

    createdVector1 = [];
    createdVector2 = [];

    Socket.emit("lazyDelete", {
      DeletedVector,
      tabletServer: metaTable.tabletServerID,
    });

    DeletedVector[0] = [];
    DeletedVector[1] = [];
  }

  res.status(200).send({ data: createdVector1.concat(createdVector2) });
  next();
});
