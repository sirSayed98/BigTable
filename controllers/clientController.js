const io = require("socket.io-client");
const dotenv = require("dotenv");
const inquirer = require("inquirer");

const axios = require("axios");
dotenv.config({ path: "config/.env" });

const axiosConfig = {
  headers: {
    "Content-Type": "application/json",
  },
};

tabletConnectionList = {
  1:
    "http://localhost:" +
    process.env.TABLET_SERVER_ONE_PORT +
    "/movie/client/tabletServer1",
  2:
    "http://localhost:" +
    process.env.TABLET_SERVER_TWO_PORT +
    "/movie/client/tabletServer2",
};

requestsList = ["Set", "DeleteCells", "DeleteRow", "AddRow", "ReadRows"];

let metadata = null;

let Socket = null;

exports.configure = (socket) => {
  Socket = socket;

  Socket.on("updateMetadata", function (sentData) {
    if (metadata == null) {
      firstConnection = true;
    }
    metadata = sentData;
    console.log("[CLIENT] metadata is updated");

    if (firstConnection) {
      readInputs();
    }
  });
};

function getTabletServerNumber(id) {
  //return 1;//remove outside of testing
  //
  let count = 1;
  let tabletNumber = -1;
  metadata.tabletServers.map((el) => {
    if (el.dataStartID <= id && el.dataEndID >= id) {
      tabletNumber = count;
    }
    count += 1;
  });

  return tabletNumber;
}
function handleSetRequest() {
  //gets data from user when the user chooses set option -> sends the data -> goes to askIfFinished function

  let rowId;
  inquirer
    .prompt([
      {
        type: "input",
        name: "requestData",
        message:
          "please add data in the following format \n" +
          " <rowKey>  , <columnName>: <value> , <columnName>:<value> ,..... \n",
      },
    ])
    .then((answer) => {
      rowId = answer.requestData.replace(/ /g, "").split(",")[0];
      let rowValueStringList = answer.requestData
        .replace(/ /g, "")
        .split(",")
        .slice(1);
      let requestJson = {};
      rowValueStringList.forEach((value) => {
        let col = value.split(":")[0];
        let val = value.split(":")[1];
        requestJson[col] = val;
      });

      let tabletNumber = getTabletServerNumber(rowId); // get tablet todo check if id exists in string
      if (tabletNumber == -1) {
        errorMessage = `this key : ${requestJson.id} doesn't exist in the database`;
        return Promise.reject(new Error(errorMessage));
      }
      console.log(tabletConnectionList[tabletNumber] + `/${rowId}`);
      return axios.put(
        tabletConnectionList[tabletNumber] + `/${rowId}`,
        requestJson,
        axiosConfig
      );
    })
    .then(function (response) {
      console.log(`[client] row of id = ${rowId} successfully updated`);
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {
      askIfFinished();
    });
}

function handleAddRowRequest() {
  //gets data from user when the user chooses addrow option -> sends the data -> goes to askIfFinished function

  inquirer
    .prompt([
      {
        //get data from user
        type: "input",
        name: "requestData",
        message:
          "please add data in the following format \n" +
          " <columnName> : <value> , <columnName> : <value> ,..... \n",
      },
    ])

    .then((answer) => {
      let tabletNumber = 1; //todo what should we do in case of add new row ??
      let rowValueStringList = answer.requestData.replace(/ /g, "").split(",");
      let requestJson = {};
      rowValueStringList.forEach((value) => {
        let col = value.split(":")[0];
        let val = value.split(":")[1];
        requestJson[col] = val;
      });

      return axios.post(
        tabletConnectionList[tabletNumber],
        requestJson,
        axiosConfig
      );
    }) // send data

    .then(function (response) {
      console.log(`[client] new row added successfully`);
    })
    .catch(function (error) {
      console.log(`[client] failed to add new row`);
    })
    .then(function () {
      askIfFinished();
    });
}
function convertListToObjectWithNull(list) {
  let newList = {};
  list.map((el) => {
    newList[el] = "";
  });
  return newList;
}

function handleDeleteCellsRequest() {
  //gets data from user when the user chooses DeleteCells option -> sends the data -> goes to askIfFinished function
  let rowId;
  inquirer
    .prompt([
      {
        type: "input",
        name: "requestData",
        message:
          "please add data in the following format \n" +
          "<rowKey>  <columnName> <columnName> <columnName> ..... \n",
      },
    ])
    .then((answer) => {
      let inputData = answer.requestData;
      rowId = inputData.trim().split(/\s+/)[0];
      let tabletNumber = getTabletServerNumber(rowId);
      if (tabletNumber == -1) {
        errorMessage = `this key : ${requestJson.id} doesn't exist in the database`;
        return Promise.reject(new Error(errorMessage));
      }

      let columnsList = inputData.trim().split(/\s+/).slice(1);

      let columnsListWithNullValues = convertListToObjectWithNull(columnsList);

      let requestJson = columnsListWithNullValues;

      //console.log(requestJson);
      console.log(rowId);
      console.log(tabletConnectionList[tabletNumber] + `/${rowId}`);
      return axios.put(
       `${tabletConnectionList[tabletNumber]}/${rowId}`,
        requestJson,
        axiosConfig
      );
    })
    .then(function (response) {
      console.log(`[client] cells deleted successfully `);
    })
    .catch(function (error) {
      console.log(`failed to delete cells from row : ${rowId}`);
    })
    .then(function () {
      askIfFinished();
    });
}

function handleDeleteRowRequest() {
  //gets data from user when the user chooses DeleteRow option -> sends the data -> goes to askIfFinished function
  let sentIdsList = [];
  inquirer
    .prompt([
      {
        type: "input",
        name: "requestData",
        message:
          "please add data in the following format \n" +
          " <row_id>  <row_id>  <row_id>  <row_id>\n ",
      },
    ])
    .then((answer) => {
      let idsList = answer.requestData.trim().split(/\s+/);
      let idsListSplitIntoTablets = splitIdsAmongTablets(idsList);
      let promiseList = [];

      //console.log(idsListSplitIntoTablets);

      if (-1 in idsListSplitIntoTablets) {
        errorMessage = `ids  : ${
          idsListSplitIntoTablets[-1]
        } are not inside the database`;
        return Promise.reject(new Error(errorMessage));
      }
      for (var tablet in idsListSplitIntoTablets) {
        var requestJson = {
          ids: idsListSplitIntoTablets[tablet], //todo check for exact name
        };
        //console.log(requestJson);
        sentIdsList.push(requestJson);
        promiseList.push(
          axios.delete(tabletConnectionList[tablet], { data: requestJson })
        );
      }

      return Promise.allSettled(promiseList);
    })
    .then(function (results) {
      let counter = 0;
      results.forEach((result) => {
        if (result.status == "rejected") {
          console.log(`failed to delete ${sentIdsList[counter].ids}`);
        } else {
          console.log(`successfully deleted ${sentIdsList[counter].ids}`);
        }
        counter += 1;
      });
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {
      askIfFinished();
    });
}

function handleReadRowRequest() {
  //gets data from user when the user chooses ReadRow option -> sends the data -> goes to askIfFinished function
  let sentIdsList = [];
  inquirer
    .prompt([
      {
        type: "input",
        name: "requestData",
        message:
          "please add data in the following format \n" +
          " <row_id> <row_id> <row_id> <row_id>\n ",
      },
    ])
    .then((answer) => {
      let idsList = answer.requestData.trim().split(/\s+/);
      console.log("__________ID LIST____________");
      console.log(idsList);

      let idsListSplitIntoTablets = splitIdsAmongTablets(idsList);
      console.log("__________________Splitted_________");
      console.log(idsListSplitIntoTablets);
      let promiseList = [];

      //console.log(idsListSplitIntoTablets);

      if (-1 in idsListSplitIntoTablets) {
        errorMessage = `ids  : ${
          idsListSplitIntoTablets[-1]
        } are not inside the database`;
        return Promise.reject(new Error(errorMessage));
      }
      for (var tablet in idsListSplitIntoTablets) {
        var requestJson = {
          ids: idsListSplitIntoTablets[tablet],
        };
        sentIdsList.push(requestJson);
        promiseList.push(
          axios.get(tabletConnectionList[tablet], { data: requestJson })
        );
      }

      return Promise.allSettled(promiseList);
    })
    .then(function (results) {
      let counter = 0;
      results.forEach((result) => {
        if (result.status == "rejected") {
          console.log(`failed to fetch ${sentIdsList[counter].ids}`);
        } else {
          console.log(
            `successfully fetched ${sentIdsList[counter].ids}` +
              "\n" +
              result.data
          );
        }
        counter += 1;
      });
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {
      askIfFinished();
    });
}

function splitIdsAmongTablets(ids) {
  listOfRequiredTablets = {};
  ids.map((el) => {
    let tabletNumber = getTabletServerNumber(el);
    if (listOfRequiredTablets[tabletNumber] == undefined) {
      listOfRequiredTablets[tabletNumber] = [el];
    } else {
      listOfRequiredTablets[tabletNumber].push(el);
    }
  });
  return listOfRequiredTablets;
}

function askIfFinished() {
  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "checkIfFinished",
        message: "do you want to make another request?",
        choices: ["yes", "no"],
      },
    ])
    .then((answer) => {
      if (answer.checkIfFinished == "no") {
        process.exit();
      } else {
        readInputs();
      }
    });
}

function readInputs() {
  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "requestType",
        message: "please choose a request type ..",
        choices: requestsList,
      },
    ])
    .then((answer) => {
      console.log(answer.requestType);
      switch (answer.requestType) {
        case "Set":
          handleSetRequest();
          break;
        case "DeleteCells":
          handleDeleteCellsRequest();
          break;
        case "DeleteRow":
          handleDeleteRowRequest();
          break;
        case "AddRow":
          handleAddRowRequest();
          break;
        case "ReadRows":
          handleReadRowRequest();
          break;
      }
    });
}

//readInputs();
