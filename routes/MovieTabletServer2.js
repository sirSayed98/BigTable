const express = require("express");
const {
  getMoviesTabletServer2,
  getMoviesTabletPartion
} = require("../controllers/MovieTabletServerTwo");

const router = express.Router();

router.route("/Part/:id").get(getMoviesTabletPartion);
router.route("/").get(getMoviesTabletServer2);

module.exports = router;
