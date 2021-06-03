const express = require("express");
const {
  getMoviesTabletServer,
  getMoviesTabletPartion,
  deleteMovieByID, 
  updateMovieByID
} = require("../controllers/MovieTabletServerOne");

const router = express.Router();


router.route("/Part/:id").get(getMoviesTabletPartion);
router.route("/").get(getMoviesTabletServer);

router.route("/:tabletID/:id").delete(deleteMovieByID);
router.route("/:id").put(updateMovieByID);

module.exports = router;