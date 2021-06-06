const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const io = require("socket.io-client");
const dotenv = require("dotenv");
const { connectToDB } = require("../config/MovieTabletServerConnect");
const getTime = require("../utils/getTime");
dotenv.config({ path: "../config/.env" });

const Socket = io.connect(process.env.MASTER_SERVER_HOST);
const MovieTablet3 = connectToDB(process.env.TABLET_SERVER_TWO_ONE_CONN, 3);
const MovieTablet4 = connectToDB(process.env.TABLET_SERVER_TWO_TWO_CONN, 4);

var Mutex = require("async-mutex").Mutex;
const mutex = new Mutex();
const { E_CANCELED } = require("async-mutex");

let metaTable = {};
let DeletedVector = [[], []];

let editMovies = [];
let editIDs = [];

let createdVector1 = [];
let createdVector2 = [];

Socket.on("connect", function (so) {
  console.log(
    "[TABLET] Tablet Server2 has been connected to the master server!"
  );
});

//send Status of TabletServer to Master Server
Socket.emit("status", {
  tabletCount: process.env.TABLET_SERVER_TWO_TABLETS * 1,
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
  tablets[0].ID = 3;
  tablets[0].numOfRows = part1.length;

  tablets[1].startID = tablets[0].endID + 1;
  tablets[1].endID = tablets[1].startID + part2.length - 1;
  tablets[1].ID = 4;
  tablets[1].numOfRows = part2.length;

  metaTable.endID = tablets[1].endID;
  metaTable.tablets = tablets;
  metaTable.tabletCapacity = process.env.TABLET_CAPACITY * 1;
  //console.log(metaTable);

  setTimeout(async () => {
    await MovieTablet3.db.collection("Movie").deleteMany();
    await MovieTablet4.db.collection("Movie").deleteMany();
    await MovieTablet3.db.collection("Movie").insertMany(part1);
    await MovieTablet4.db.collection("Movie").insertMany(part2);
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
  let interval = setInterval(async () => {
    if (!mutex.isLocked()) {
      const arr1 = await MovieTablet3.db
        .collection("Movie")
        .find({ id: { $in: req.body.ids }, deleted: false })
        .toArray();

      const arr2 = await MovieTablet4.db
        .collection("Movie")
        .find({ id: { $in: req.body.ids }, deleted: false })
        .toArray();

      const films = arr1.concat(arr2);

      console.log(films);

      res.status(200).json({
        success: true,
        count: films.length,
        data: films,
      });
    } else {
      console.log(`[TABLAT] don't have key`);
    }
    next();
    clearInterval(interval);
  }, 300);
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
  next();
});

exports.deleteMovieByID = asyncHandler(async (req, res, next) => {
  var t1StartID = metaTable.tablets[0].startID;
  var t1EndID = metaTable.tablets[0].endID;

  var t2StartID = metaTable.tablets[1].startID;
  var t2EndID = metaTable.tablets[1].endID;

  var Len1 = DeletedVector[0].length;
  var Len2 = DeletedVector[1].length;

  req.body.ids.forEach((el) => {
    if (t1StartID <= el && el <= t1EndID) {
      DeletedVector[0].push(el);
    }
    if (t2StartID <= el && el <= t2EndID) {
      DeletedVector[1].push(el);
    }
  });

  mutex
    .runExclusive(async () => {
      console.log(`[TABLET] acquire lock`);
      await MovieTablet3.db
        .collection("Movie")
        .updateMany(
          { id: { $in: DeletedVector[0] } },
          { $set: { deleted: true } },
          { upsert: false }
        );

      await MovieTablet4.db
        .collection("Movie")
        .updateMany(
          { id: { $in: DeletedVector[1] } },
          { $set: { deleted: true } },
          { upsert: false }
        );
    })
    .then(() => {
      req.body.ids.forEach((id) => {
        let startIndex = editIDs.indexOf(id);
        if (startIndex !== -1) {
          editMovies.splice(startIndex, 1);
          editIDs.splice(startIndex, 1);
          console.log(`[TABLET] Remove ID: ${id} from edit lazy list`);
        }
      });

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
      console.log(`[TABLET] release lock`);
    })
    .catch((e) => {
      if (e === E_CANCELED) {
        console.log(e);
      }
    });
});

exports.updateMovieByID = asyncHandler(async (req, res, next) => {
  let id = req.params.id * 1;

  var t1StartID = metaTable.tablets[0].startID;
  var t1EndID = metaTable.tablets[0].endID;

  var t2StartID = metaTable.tablets[1].startID;
  var t2EndID = metaTable.tablets[1].endID;

  var Tablet =
    t1StartID <= id && id <= t1EndID
      ? 3
      : t2StartID <= id && id <= t2EndID
      ? 4
      : 0;
  if (Tablet == 0) {
    return res.status(404).json({
      success: false,
      Message: `this id:${id} is not available in this tablet server`,
    });
  }

  var reqBody = Object.values(req.body);

  let Movie;

  mutex
    .runExclusive(async () => {
      console.log(`[TABLET] acquire lock`);
      if (reqBody[0] === "") {
        Movie =
          Tablet == 3
            ? await MovieTablet3.db
                .collection("Movie")
                .updateOne({ id: id }, { $unset: req.body }, { upsert: false })
            : await MovieTablet4.db
                .collection("Movie")
                .updateOne({ id: id }, { $unset: req.body }, { upsert: false });
      } else {
        Movie =
          Tablet == 3
            ? await MovieTablet3.db
                .collection("Movie")
                .updateOne({ id: id }, { $set: req.body }, { upsert: false })
            : await MovieTablet4.db
                .collection("Movie")
                .updateOne({ id: id }, { $set: req.body }, { upsert: false });
      }

      console.log(`[TABLET] update Movie id: ${id}`);
    })
    .then(() => {
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
      console.log(`[TABLET] release lock`);
    })
    .catch((e) => {
      if (e === E_CANCELED) {
        console.log(e);
      }
    });
});

exports.createMovie = asyncHandler(async (req, res, next) => {
  let interval = setTimeout(async () => {
    if (!mutex.isLocked()) {
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
          ? await MovieTablet3.db.collection("Movie").insertOne(req.body)
          : await MovieTablet4.db.collection("Movie").insertOne(req.body);

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
      clearInterval(interval);
      next();
    }
  }, 300);
});
