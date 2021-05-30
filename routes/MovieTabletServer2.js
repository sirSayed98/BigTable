const express = require("express");
const {
  getMoviesTabletServer2,
} = require("../controllers/MovieTabletServerTwo");

const router = express.Router();

router.route("/").get(getMoviesTabletServer2);

module.exports = router;
