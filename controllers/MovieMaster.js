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
  let cap = process.env.TABLET_CAPACITY * 1;

  let step = Math.floor(Movies.length / configData.numOfTablets);

  let counter = 1;
  step = Math.min(cap, step);

  console.log(`[MASTER] step= ${step}`);
  let numOfrows = 0;
  configData.tabletServers.map((el, index) => {
    numOfrows =
      configData.tabletServers.length !== index + 1
        ? step * el.tablets
        : Math.min(cap, Movies.length - numOfrows);

    el.numOfrows = numOfrows;
    el.dataStartID = counter;
    el.dataEndID = counter + numOfrows - 1;
    counter += numOfrows;
  });

  console.log(`[MASTER] Meta Table`);
  //console.log(configData);
  // send data to tablet servers
  configData.tabletServers.map((el) => {
    var data = Movies.slice(el.dataStartID - 1, el.dataEndID);
    io.to(el.socketID).emit("metaTable", el);
    io.to(el.socketID).emit("recieveData", data);
  });
};

exports.configuration = (socket, io) => {
  configData.tabletServerCounter = io.engine.clientsCount;
  console.log("[MASTER] Master has been instailized socket");

  socket.on("status", function (data) {
    var tabletServer = {
      tabletServerID: configData.tabletServerCounter,
      tablets: data.tabletCount,
      socketID: socket.id,
    };

    configData.tabletServers.push(tabletServer);

    configData.numOfTablets += tabletServer.tablets;

    if (configData.tabletServerCounter == process.env.TABLET_SERVER_LIMIT) {
      console.log(`[MASTER] Project is now ready to simulation.`);
      divideData(configData, socket, io);
    }

    console.log(`[MASTER] System has ${configData.numOfTablets} tablets.`);
    console.log(
      `[MASTER] one of tablet servers has been connected # tabletServers = ${configData.tabletServerCounter}`
    );
  });

  socket.on("lazyUpdate", function (data) {
    console.log(`[MASTER] Server has recieved edit vector`);
    lazyUpdate(data, socket, io);
  });

  socket.on("lazyDelete", function (data) {
    console.log(`[MASTER] Server has recieved deleted vector from Tablet`);
    lazyDelete(data, socket, io);
  });

  socket.on("deleteAndRebalance", async function (data) {
    var DeletedVector = data.DeletedVector;

    console.log("[MASTER] Recieved Data should be deleted from other Tablet");
    console.log(DeletedVector);

    DeletedVector.map((vector) => {
      vector.map(async (el) => {
        console.log(`[MASTER] row :  ${el} has been deleted`);
        await Movie.findOneAndDelete({ id: el });
      });
    });

    console.log("__________________Re-balance Stage__________");
    const movies = await Movie.find();

    var IDs = Array.from({ length: movies.length }, (_, i) => i + 1);

    movies.forEach((movie, index) => {
      movie.id = IDs[index];
    });

    await Movie.deleteMany();
    await Movie.insertMany(movies);

    console.log(`[MASTER] finish updating master`);

    divideData(configData, socket, io);
  });

  
};

const lazyDelete = async (data, socket, io) => {
  let DeletedVector = data.DeletedVector;
  let tabletServerID = data.tabletServer;

  console.log(`[Master] recieve deleted vector from server: ${tabletServerID}`);

  DeletedVector.map((vector) => {
    vector.map(async (el) => {
      console.log(`[MASTER] row :  ${el} has been deleted`);
      await Movie.findOneAndDelete({ id: el });
    });
  });

  let otherServerID = tabletServerID % 2;
  let socketID = configData.tabletServers[otherServerID].socketID;
  console.log(
    `[MASTER] Send re-balance request to the server: ${otherServerID}`
  );
  io.to(socketID).emit("reBalance", {});
};
const lazyUpdate = async (data, socket, io) => {
  var ids = data.editIDs;
  var movies = data.editMovies;

  movies.forEach(async (movie, index) => {
    await Movie.findOneAndUpdate({ id: ids[index] }, movie);
    console.log(`[MASTER] update movie id: ${ids[index]}`);
  });
};
