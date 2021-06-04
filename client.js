const io = require("socket.io-client");
const dotenv = require("dotenv");
const inquirer = require("inquirer");

const axios = require("axios");
dotenv.config({ path: "config/.env" });
const {configure} = require("./controllers/client.controller");
const Socket = io.connect(process.env.MASTER_SERVER_HOST);




Socket.on("connect",function(co){
    console.log("[client] a new client is connected to master");
    configure(Socket);
});







