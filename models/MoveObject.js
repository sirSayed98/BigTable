const getTime = require("../utils/getTime");

const MovieObj = {
  id: {
    type: Number,
  },
  budget: {
    type: Number,
  },
  revenue: {
    type: Number,
  },
  original_title: {
    type: String,
  },
  cast: {
    type: String,
  },
  homepage: {
    type: String,
  },
  director: {
    type: String,
  },
  tagline: {
    type: String,
  },
  keywords: {
    type: String,
  },
  overview: {
    type: String,
  },
  genres: {
    type: String,
  },
  production_companies: {
    type: String,
  },
  vote_average: {
    type: Number,
  },
  release_year: {
    type: String,
  },
  createdAt: {
    type: String,
    default: getTime(),
  },
  deleted: {
    type: Boolean,
    default: false,
  },
};
module.exports = MovieObj;
