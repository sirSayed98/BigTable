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
    1:"http://localhost:"+process.env.TABLET_SERVER_ONE_PORT+"/movie/client/tablet1",
    2:"http://localhost:"+process.env.TABLET_SERVER_ONE_PORT+"/movie/client/tablet2",
    3:"http://localhost:"+process.env.TABLET_SERVER_TWO_PORT+"/movie/client/tablet3",
    4:"http://localhost:"+process.env.TABLET_SERVER_TWO_PORT+"/movie/client/tablet4"
}

requestsList = [
    "Set",
    "DeleteCells",
    "DeleteRow",
    "AddRow",
    "ReadRows"
]


let metadata = {tabletServers:[
    {dataStartID:1,dataEndID:5},
    {dataStartID:6,dataEndID:10},
    {dataStartID:11,dataEndID:15},
    {dataStartID:16,dataEndID:20},
]
};

let Socket = null;


exports.configure= (socket)=>{
    Socket = socket;
    
    Socket.on("updateMetadata",function (sentData){
        if(metadata == null){
            firstConnection = true;
        }
        metadata =  sentData;  
        console.log("[client] metadata is updated");

        if(firstConnection){
            readInputs();
        }
    });
}


function getTabletNumber(id){
    //return 1;//remove outside of testing
    //
    let count = 1;
    let tabletNumber = -1;
    metadata.tabletServers.map(el=>{
        if(el.dataStartID <= id && el.dataEndID >= id){
            tabletNumber = count;
        }
        count+=1;
    });

    return tabletNumber;
}
function handleSetRequest(){ //gets data from user when the user chooses set option -> sends the data -> goes to askIfFinished function
    inquirer.prompt([{
        type:"input",
        name:"requestData",
        message:"please add data in the following format \n"+
        " {\"id\" : \"<rowKey>\" , \"<columnName>\": \"<value>\" , \"<columnName>\":\"<value>\" ,..... }\n",}])
    .then(answer =>{
        try{
            requestJson = JSON.parse(answer.requestData);           
        }catch {
            return Promise.reject(new Error("[Client] error in input format"));
        }
        let tabletNumber = getTabletNumber(requestJson.id) // get tablet todo check if id exists in string
        if(tabletNumber==-1){
            
            errorMessage = `this key : ${requestJson.id} doesn't exist in the database`;
            return Promise.reject(new Error(errorMessage));
        }
        return axios.put(tabletConnectionList[tabletNumber],requestJson,axiosConfig)})
    .then(function (response) {
            console.log(`[client] row of id = ${requestJson.id} successfully updated`);
        })
    .catch(function (error) {
            console.log(error);
        })
    .then(function () {
            askIfFinished();
        });  
}

function handleAddRowRequest(){ //gets data from user when the user chooses addrow option -> sends the data -> goes to askIfFinished function
    
    inquirer.prompt([{ //get data from user
        type:"input",
        name:"requestData",
        message:"please add data in the following format \n"+
        " { \"<columnName>\": \"<value>\" , \"<columnName>\":\"<value>\" ,..... }\n",}])
    
    .then(answer =>{
        try{
            requestJson = JSON.parse(answer.requestData);           
        }catch {
            return Promise.reject(new Error("[Client] error in input format"));
        }
        let tabletNumber = 1 ; //todo what should we do in case of add new row ??
        return axios.post(tabletConnectionList[tabletNumber],requestJson,axiosConfig)}) // send data
        
    .then(function (response) {
            console.log(`[client] new row added successfully`);
          })
    .catch(function (error) {
            console.log(error);
          })
    .then(function () {
            askIfFinished();
          });  
}
function convertListToObjectWithNull(list){
    let newList = {}
    list.map(el =>{
        newList[el] = null;
    });
    return newList;
}

function handleDeleteCellsRequest(){ //gets data from user when the user chooses DeleteCells option -> sends the data -> goes to askIfFinished function
    inquirer.prompt([{
        type:"input",
        name:"requestData",
        message:"please add data in the following format \n"+
        " {\"id\" : \"<rowKey>\" , \"columns\": \"[<columnName>,<columnName>,<columnName>,.....]\" }\n "}])
    .then(answer =>{
        try{
            dataInputJson = JSON.parse(answer.requestData);
        }catch {
            return Promise.reject(new Error("[Client] error in input format"));
        }
        let tabletNumber = getTabletNumber(dataInputJson.id) // get tablet todo check if id exists in string
        if(tabletNumber==-1){
            errorMessage = `this key : ${requestJson.id} doesn't exist in the database`;
            return Promise.reject(new Error(errorMessage));
        }
        let columnsString = dataInputJson.columns
        let columnsList = columnsString.replace("[","").replace("]","").replace(/ /g,'').split(",");
        console.log(columnsList);
        let columnsListWithNullValues = convertListToObjectWithNull(columnsList);
        console.log(columnsListWithNullValues);
        let requestJson = {
            id : dataInputJson.id
        }
        requestJson = {
            ...requestJson,
            ...columnsListWithNullValues
            }
        
        return axios.put(tabletConnectionList[tabletNumber],requestJson,axiosConfig)
    })
    .then(function (response) {
            console.log(`[client] cells deleted successfully `);
        })
    .catch(function (error) {
            console.log(error);
        })
    .then(function () {
            askIfFinished();
        });  
}



function handleDeleteRowRequest(){ //gets data from user when the user chooses DeleteRow option -> sends the data -> goes to askIfFinished function
    let sentIdsList = []
    inquirer.prompt([{
        type:"input",
        name:"requestData",
        message:"please add data in the following format \n"+
        " {\"ids\" : \"[<rowKey>,<rowKey>,<rowKey>,.......]\" }\n "}]) 
    .then(answer =>{
        try{
            dataInputJson = JSON.parse(answer.requestData);
        }catch {
            return Promise.reject(new Error("[Client] error in input format"));
        }
        
        let idsString = dataInputJson.ids;
        let idsList = idsString.replace("[","").replace("]","").replace(/ /g,'').split(",");
        let idsListSplitIntoTablets= splitIdsAmongTablets(idsList);
        let promiseList = []
        
        console.log(idsListSplitIntoTablets);

        if (-1 in idsListSplitIntoTablets){
            errorMessage = `ids  : ${idsListSplitIntoTablets[-1]} are not inside the database`;
            return Promise.reject(new Error(errorMessage));
        }
        for (var tablet in idsListSplitIntoTablets){
            var requestJson = {
                ids : idsListSplitIntoTablets[tablet]
            };
            sentIdsList.push(requestJson);
            promiseList.push(axios.delete(tabletConnectionList[tablet],{data:requestJson}));
        }
        
        return Promise.allSettled(promiseList);
    })
    .then(function (results) {
        let counter = 0;
        results.forEach((result) => {
            if(result.status == "rejected"){
                console.log(`failed to delete ${sentIdsList[counter].ids}`);
            }
            else{
                console.log(`successfully deleted ${sentIdsList[counter].ids}`);
            }
            counter+=1
        })
    })
    .catch(function (error) {
            console.log(error);
        })
    .then(function () {
            askIfFinished();
        });  
}



function handleReadRowRequest(){ //gets data from user when the user chooses ReadRow option -> sends the data -> goes to askIfFinished function
    let sentIdsList = []
    inquirer.prompt([{
        type:"input",
        name:"requestData",
        message:"please add data in the following format \n"+
        " {\"ids\" : \"[<rowKey>,<rowKey>,<rowKey>,.......]\" }\n "}]) 
    .then(answer =>{
        try{
            dataInputJson = JSON.parse(answer.requestData);
        }catch {
            return Promise.reject(new Error("[Client] error in input format"));
        }
        
        let idsString = dataInputJson.ids;
        let idsList = idsString.replace("[","").replace("]","").replace(/ /g,'').split(",");
        let idsListSplitIntoTablets= splitIdsAmongTablets(idsList);
        let promiseList = []
        
        console.log(idsListSplitIntoTablets);

        if (-1 in idsListSplitIntoTablets){
            errorMessage = `ids  : ${idsListSplitIntoTablets[-1]} are not inside the database`;
            return Promise.reject(new Error(errorMessage));
        }
        for (var tablet in idsListSplitIntoTablets){
            var requestJson = {
                ids : idsListSplitIntoTablets[tablet]
            };
            sentIdsList.push(requestJson);
            promiseList.push(axios.get(tabletConnectionList[tablet],requestJson));
        }
        
        return Promise.allSettled(promiseList);
    })
    .then(function (results) {
        let counter = 0;
        results.forEach((result) => {
            if(result.status == "rejected"){
                console.log(`failed to fetch ${sentIdsList[counter].ids}`);
            }
            else{
                console.log(`successfully fetched ${sentIdsList[counter].ids}`+"\n"+result.data);
                
            }
            counter+=1
        })
    })
    .catch(function (error) {
            console.log(error);
        })
    .then(function () {
            askIfFinished();
        });  

}












function splitIdsAmongTablets(ids){
    listOfRequiredTablets = {}
    ids.map(el =>{
        let tabletNumber = getTabletNumber(el);
        if(listOfRequiredTablets[tabletNumber] == undefined){
            listOfRequiredTablets[tabletNumber] = [el];
        }else{
            listOfRequiredTablets[tabletNumber].push(el);
        }
    });
    return listOfRequiredTablets;
}

function askIfFinished(){
    inquirer.prompt([{
        type:"rawlist",
        name:"checkIfFinished",
        message:"do you want to make another request?",
        choices:["yes","no"]
    }]).then( answer=>{
        if(answer.checkIfFinished == "no"){
            process.exit()
        }else{
            readInputs();
        }
    });
}

function readInputs(){
    inquirer.prompt([{
        type:"rawlist",
        name:"requestType",
        message:"please choose a request type ..",
        choices:requestsList
    }]).then( answer =>{
        console.log(answer.requestType);
        switch (answer.requestType){
            case "Set":
                handleSetRequest();
            break;
            case "DeleteCells" :
                handleDeleteCellsRequest();
            break;
            case "DeleteRow" :
                handleDeleteRowRequest();
            break;
            case "AddRow":
                handleAddRowRequest();
            break;
            case "ReadRows":
                handleReadRowRequest();
            break;
        }
    })
}



readInputs();