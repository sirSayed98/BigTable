const mongoose = require("mongoose");
const MovieObj = require("./MoveObject");

const MovieSchema = new mongoose.Schema(MovieObj);

module.exports = MovieSchema;
