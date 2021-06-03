const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const Movie = require("../models/Movie");

let configData = {
  tabletServerCounter: 0,
  numOfTablets: 0,
  tabletServers: [],
};

exports.getMovies = asyncHandler(async (req, res, next) => {
  const Movies = await Movie.find().limit(30);

  res.status(200).json({
    success: true,
    count: Movies.length,
    data: Movies,
  });
});

const divideData = async (configData, socket, io) => {
  const Movies = await Movie.find();
  let step = Movies.length / configData.numOfTablets;
  let counter = 1;
  step =
    process.env.TABLET_CAPACITY * 1 >= step
      ? step
      : process.env.TABLET_CAPACITY * 1;

  console.log(`[SERVER] step= ${step}`);
  configData.tabletServers.map((el) => {
    let numOfrows = step * el.tablets;
    el.numOfrows = numOfrows;
    el.dataStartID = counter;
    el.dataEndID = counter + numOfrows - 1;
    counter += numOfrows;
  });

  console.log(`[SERVER] Meta Table`);
  console.log(configData);
  // send data to tablet servers
  configData.tabletServers.map((el) => {
    var data = Movies.slice(el.dataStartID - 1, el.dataEndID);
    io.to(el.socketID).emit("metaTable", el);
    io.to(el.socketID).emit("recieveData", data);
  });
};

exports.configuration = (socket, io) => {
  configData.tabletServerCounter = io.engine.clientsCount;
  console.log("[SERVER] Master has been instailized socket");

  socket.on("status", function (data) {
    var tabletServer = {
      tabletServerID: configData.tabletServerCounter,
      tablets: data.tabletCount,
      socketID: socket.id,
    };

    configData.tabletServers.push(tabletServer);

    configData.numOfTablets += tabletServer.tablets;

    if (configData.tabletServerCounter == process.env.TABLET_SERVER_LIMIT) {
      console.log(`[SERVER] Project is now ready to simulation.`);
      divideData(configData, socket, io);
    }

    console.log(`[SERVER] System has ${configData.numOfTablets} tablets.`);
    console.log(
      `[SERVER] one of tablet servers has been connected # tabletServers = ${configData.tabletServerCounter}`
    );
  });

  socket.on("lazyDelete", function (data) {
    console.log(`[SERVER] Server has recieved deleted vector from Tablet`);
    lazyDelete(data, socket);
  });
};

const lazyDelete = async (data, socket, io) => {
  let DeletedVector = data.DeletedVector;
  let TabletID = data.id;
  let tabletServerID = data.tabletServer;

  let deletedSize = DeletedVector[0].length + DeletedVector[1].length;

  for (let i = 0; i < DeletedVector[0].length; i++) {
    for (let j = 0; j < DeletedVector[1].length; j++) {
      await Movie.findByIdAndRemove(DeletedVector[i][j]);
      console.log(`[MASTER has deleted row: ${DeletedVector[i][j]}]`);
    }
  }
  console.log("____________MASTER__________");
  console.log(TabletID, tabletServerID, deletedSize);

  //update range for the other TabletServe
  let otherServerID = tabletServerID % 2;
  let OtherServer = configData.tabletServers[otherServerID];
  let socketID = OtherServer.socketID;

  console.log("____________________MASTER_____________");
  console.log(otherServerID, OtherServer, socketID);

  io.to(socketID).emit("reBalance", {
    dataEndID: OtherServer.dataEndID - deletedSize / 2,
  });
  socket.on("sendDeletedVector", function (data) {
    console.log("[SERVER] Recieved Data should be deleted from Tablet");
    var tablets = data.vector;
    tablets.forEach(async (element) => {
      await Movie.findByIdAndRemove(element);
      console.log(`[MASTER] has deleted row: ${element}`);
    });

    //update ranges for server which send the first requesr
  });
};
