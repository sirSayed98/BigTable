const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const Movie = require("../models/Movie");
const loggingFilePath = "log.txt";
const axios = require("axios");
const fs = require("fs");

fs.writeFile(loggingFilePath, "", () => {});

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
  fs.appendFile(
    loggingFilePath,
    `[MASTER] step= ${step}` + "\n",
    function (err) {}
  );
  let numOfrows = 0;

  configData.tabletServers.map((el, index) => {
    numOfrows =
      configData.tabletServers.length !== index + 1
        ? step * el.tablets
        : Math.min(2 * cap, Movies.length - numOfrows);

    el.numOfrows = numOfrows;
    el.dataStartID = counter;
    el.dataEndID = counter + numOfrows - 1;
    counter += numOfrows;
  });

  // send meta data to tablet servers
  configData.tabletServers.map((el) => {
    var data = Movies.slice(el.dataStartID - 1, el.dataEndID);
    io.to(el.socketID).emit("metaTable", el);
    io.to(el.socketID).emit("recieveData", data);
  });
  //axios

  const axiosConfig = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  let url =
    process.env.CLIENT_SERVER_BASE_URL +
    ":" +
    process.env.CLIENT_ONE_PORT +
    "/recieveMeta";
  axios
    .put(url, configData, axiosConfig)
    .then((myres) => {})
    .catch((err) => {});

  url =
    process.env.CLIENT_SERVER_BASE_URL +
    ":" +
    process.env.CLIENT_TWO_PORT +
    "/recieveMeta";
  axios
    .put(url, configData, axiosConfig)
    .then((myres) => {})
    .catch((err) => {});
};

exports.configuration = (socket, io) => {
  console.log("[MASTER] Master has been instailized socket");
  fs.appendFile(
    loggingFilePath,
    "[MASTER] Master has been instailized socket" + "\n",
    function (err) {}
  );

  //send meta data to clients
  socket.emit("updateMetadata", configData);

  socket.on("status", function (data) {
    configData.tabletServerCounter += 1;
    var tabletServer = {
      tabletServerID: configData.tabletServerCounter,
      tablets: data.tabletCount,
      socketID: socket.id,
    };

    configData.tabletServers.push(tabletServer);

    configData.numOfTablets += tabletServer.tablets;

    console.log(`[MASTER] `);

    divideData(configData, socket, io);
    console.log(
      `[MASTER] one of tablet servers has been connected # tabletServers = ${configData.tabletServerCounter}`
    );
    fs.appendFile(
      loggingFilePath,
      `[MASTER] one of tablet servers has been connected # tabletServers = ${configData.tabletServerCounter}` +
        "\n",
      function (err) {}
    );

    console.log(`[MASTER] System has ${configData.numOfTablets} tablets.`);
    fs.appendFile(
      loggingFilePath,
      `[MASTER] System has ${configData.numOfTablets} tablets.` + "\n",
      function (err) {}
    );
  });

  socket.on("lazyUpdate", function (data) {
    console.log(`[MASTER] Server has recieved edit vector`);
    fs.appendFile(
      loggingFilePath,
      `[MASTER] Server has recieved edit vector` + "\n",
      function (err) {}
    );
    lazyUpdate(data, socket, io);
  });

  socket.on("lazyCreate", function (data) {
    console.log(`[MASTER] Server has recieved created vector from tablet`);
    fs.appendFile(
      loggingFilePath,
      `[MASTER] Server has recieved created vector from tablet` + "\n",
      function (err) {}
    );
    lazyCreate(data, socket, io);
  });

  socket.on("logging", function (data) {
    fs.appendFile(loggingFilePath, data + "\n", function (err) {});
  });

  socket.on("lazyDelete", function (data) {
    console.log(`[MASTER] Server has recieved deleted vector from Tablet`);
    fs.appendFile(
      loggingFilePath,
      `[MASTER] Server has recieved deleted vector from Tablet` + "\n",
      function (err) {}
    );
    lazyDelete(data, socket, io);
  });

  socket.on("deleteAndRebalance", async function (data) {
    var DeletedVector = data.DeletedVector;

    console.log("[MASTER] Recieved Data should be deleted from other Tablet");
    fs.appendFile(
      loggingFilePath,
      "[MASTER] Recieved Data should be deleted from other Tablet" + "\n",
      function (err) {}
    );
    console.log(DeletedVector);

    DeletedVector.map((vector) => {
      vector.map(async (el) => {
        console.log(`[MASTER] row :  ${el} has been deleted`);
        fs.appendFile(
          loggingFilePath,
          `[MASTER] row :  ${el} has been deleted` + "\n",
          function (err) {}
        );
        await Movie.findOneAndDelete({ id: el });
      });
    });

    fs.appendFile(
      loggingFilePath,
      `[MASTER] Re-balance Stage` + "\n",
      function (err) {}
    );

    const movies = await Movie.find().sort({ createdAt: 1 });

    var IDs = Array.from({ length: movies.length }, (_, i) => i + 1);

    movies.forEach((movie, index) => {
      movie.id = IDs[index];
    });

    await Movie.deleteMany();
    await Movie.insertMany(movies);

    console.log(`[MASTER] finish updating master`);
    fs.appendFile(
      loggingFilePath,
      `[MASTER] finish updating master` + "\n",
      function (err) {}
    );

    divideData(configData, socket, io);
  });

  socket.on("disconnect", function () {
    let flag = false;
    configData.tabletServers.forEach((el) => {
      if (el.socketID === socket.id) flag = true;
    });

    if (flag) {
      configData.tabletServerCounter -= 1;
      configData.numOfTablets -= 2;

      let disconnectedID = socket.id;

      const index =
        configData.tabletServers[0].socketID == disconnectedID ? 0 : 1;

      let serverID = index + 1;

      console.log(`[MASTER] tablet server ${serverID} has been disconnected`);
      fs.appendFile(
        loggingFilePath,
        `[MASTER] tablet server ${serverID} has been disconnected` + "\n",
        function (err) {}
      );
      if (configData.tabletServerCounter !== 0) {
        configData.tabletServers.splice(index, 1);
        divideData(configData, socket, io);
      } else {
        console.log(`[MASTER] no tablet server are ready`);
        fs.appendFile(
          loggingFilePath,
          `[MASTER] no tablet server are ready` + "\n",
          function (err) {}
        );
        configData = {
          tabletServerCounter: 0,
          numOfTablets: 0,
          tabletServers: [],
        };
      }
    } else {
      console.log(`[MASTER] A client has been disconnect`);
      fs.appendFile(
        loggingFilePath,
        `[MASTER]  A client has been disconnect`,
        function (err) {}
      );
    }
  });
};

const lazyDelete = async (data, socket, io) => {
  let DeletedVector = data.DeletedVector;
  let tabletServerID = data.tabletServer;

  console.log(`[MASTER] Confirm lazy delete`);
  fs.appendFile(
    loggingFilePath,
    `[MASTER] Confirm lazy delete` + "\n",
    function (err) {}
  );
  console.log(`[Master] recieve deleted vector from server: ${tabletServerID}`);
  fs.appendFile(
    loggingFilePath,
    `[Master] recieve deleted vector from server: ${tabletServerID}` + "\n",
    function (err) {}
  );
  DeletedVector.map((vector) => {
    vector.map(async (el) => {
      console.log(`[MASTER] row :  ${el} has been deleted`);
      fs.appendFile(
        loggingFilePath,
        `[MASTER] row :  ${el} has been deleted` + "\n",
        function (err) {}
      );
      await Movie.findOneAndDelete({ id: el });
    });
  });

  let otherServerID = tabletServerID % 2;
  let socketID = configData.tabletServers[otherServerID].socketID;
  console.log(
    `[MASTER] Send re-balance request to the server: ${otherServerID}`
  );
  fs.appendFile(
    loggingFilePath,
    `[MASTER] Send re-balance request to the server: ${otherServerID}` + "\n",
    function (err) {}
  );
  io.to(socketID).emit("reBalance", {});
};
const lazyUpdate = async (data, socket, io) => {
  console.log(`[MASTER] Confirm lazy update`);
  fs.appendFile(
    loggingFilePath,
    `[MASTER] Confirm lazy update` + "\n",
    function (err) {}
  );
  var ids = data.editIDs;
  var movies = data.editMovies;

  movies.forEach(async (movie, index) => {
    await Movie.findOneAndUpdate({ id: ids[index] }, movie);
    console.log(`[MASTER] update movie id: ${ids[index]}`);
    fs.appendFile(
      loggingFilePath,
      `[MASTER] update movie id: ${ids[index]}` + "\n",
      function (err) {}
    );
  });
};
const lazyCreate = async (data, socket, io) => {
  let tablets1 = data.createdVector1;
  let tablets2 = data.createdVector2;

  console.log(`[MASTER] Confirm lazy create`);
  fs.appendFile(
    loggingFilePath,
    `[MASTER] Confirm lazy create` + "\n",
    function (err) {}
  );
  let tablets = tablets1.concat(tablets2);
  await Movie.insertMany(tablets);
};
