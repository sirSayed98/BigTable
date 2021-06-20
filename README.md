# Distributed System - BigTable
Bigtable is a distributed storage system for managing structured data that is designed to scale 
to a very large size .


# System Components

The system consists of 3 major components : 
 1. Master Server
 2. Tablet Servers
 3. Clients

# System Objectives
## Master Server	

  - Balance data between connected tablet servers .
  - Construct metadata and send it to the clients.
  - Re-balance data . 
  - Manage logs of the whole system .

## Tablet Servers	

  - Each tablet server manages number of tablets .
  - Provide API for clients .
  - Handle read requests without locking .
  - Handle update/delete requests (mutex-lock) .
  - Contain lazy deleted , updated , created  vectors . 
  - Send their logs to master immediately . 
  
## Clients	

  - Send requests to tablet servers .
  - Choose right tablet server according to available metadata .

# System Support
any number of tablet servers can be added and each tablet server can manage any number of tablets . 

# System Architecture

![System architecture](https://ic.pics.livejournal.com/fabless/14408737/153699/153699_640.jpg)

# Run

```

# install dependencies
$ npm i

# run master server
$ npm run master

# run tablet servers
$ npm run tabletserver1
$ npm run tabletserver2

# run clients
$ npm run client1
$ npm run client2

```

