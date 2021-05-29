const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const Movie = require("../models/Movie");

exports.getMovies = asyncHandler(async (req, res, next) => {
  const Movies = await Movie.find().limit(20);

  console.log("________");
  res.status(200).json({
    success: true,
    data: Movies,
  });
});

exports.configuration = (socket, configData) => {
  //console.log(io.engine.clientsCount)
  configData.tabletServerCounter++;
  console.log("[SERVER] Master has been instailized socket");

  socket.on("status", function (data) {
    var tabletServer = {
      clientID: configData.tabletServerCounter,
      tablets: data.tabletCount,
    };

    configData.tabletServers.push(tabletServer);
    configData.tabletServers.map((el) => {
      configData.numOfTablets += el.tablets;
    });

    console.log(`[SERVER] System has ${configData.numOfTablets} tablets.`);
    console.log(
      `[SERVER] one of tablet servers has been
      connected # tabletServers = ${configData.tabletServerCounter}`
    );

   
  });
};
