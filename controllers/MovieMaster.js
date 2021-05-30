const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const Movie = require("../models/Movie");

let configData = {
  tabletServerCounter: 0,
  numOfTablets: 0,
  tabletServers: [],
};

exports.getMovies = asyncHandler(async (req, res, next) => {
  const Movies = await Movie.find().limit(20);

  res.status(200).json({
    success: true,
    data: Movies,
  });
});

const divideData = async (configData) => {
  const Movies = await Movie.find().limit(8);
  const step = Movies.length / configData.numOfTablets;
  let counter = 1;
  configData.tabletServers.map((el) => {
    let numOfrows = step * el.tablets;
    el.dataStartID = counter;
    el.dataEndID = counter + numOfrows;
    counter += numOfrows;
  });
  console.log(configData);
};

exports.configuration = (socket) => {
  //console.log(io.engine.clientsCount)
  configData.tabletServerCounter++;
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
      divideData(configData);
    }

    console.log(`[SERVER] System has ${configData.numOfTablets} tablets.`);
    console.log(
      `[SERVER] one of tablet servers has been connected # tabletServers = ${configData.tabletServerCounter}`
    );
  });
};
