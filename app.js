const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();

// Creating the engine views to render EJS files from "views" folder.
app.set('views engine', 'ejs');

// Making the app use the body-parser middleware to parse data from forms.
app.use(bodyParser.urlencoded({
  extended: true
}));

// Configuring express server to serve static files (css, images, javascript) from "public" folder.
app.use(express.static("public"));

// Connecting to MongoDB server cross-connect-circuits.
mongoose.connect("mongodb://localhost:27017/cross-connect-circuits", {
  useNewUrlParser: true
});

mongoose.set('useFindAndModify', false);


// Creating the Model Schema, a structure in which the documents will be saved.
const circuitSchema = {
  _id: {
    type: String,
    required: true,
    // unique: true
  },
  serviceprovider: String,
  bandwidth: Number,
  patchpanel: String,
  port: String,
  device: String,
  interface: String,
  az: String,
  cluster: String
};


const skyrimPhrases = [
  "Believe, believe, the dragonborn comes...",
  "Dovahkiin, dovahkiin, naal ok zin los vahriin",
  "I used to be an adventurer like you, then I took an arrow to the knee.",
  "Down with Ulfric, the killer of kings! On the day of your death we will drink and we'll sing!",
  "What is better? To be born good, or to overcome your evil nature through great effort?",
  "My favorite drinking buddy! Let's get some mead.",
  "You do not even know our tongue, do you? Such arrogance, to dare take for yourself the name of Dovah!",
  "We drink to our youth, for days come and gone. For the Age of Aggression is just about done!",
  "We're the children of Skyrim, and we fight all our lives!"
];

function randomSkyrimPhrase(max) {
  return Math.floor(Math.random() * max);
}


// Creating Model, which is the constructor method.
const Xconn = mongoose.model("Connection", circuitSchema);


// This action is triggered when a request is received at the home route.
app.get("/", function(req, res) {
  res.render("index.ejs");
});

// Render search.ejs when route "/search" receives a request.
app.get("/search", function(req, res) {
  res.render("search.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });

});

app.get("/add", function(req, res) {
  res.render("add.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/addcircuit", function(req, res) {
  res.render("addcircuit.ejs");
});

app.get("/addpp", function(req, res) {
  res.render("workinprogress.ejs");
});

app.get("/update", function(req, res) {
  res.render("update.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});


// When a serial ID is received at the "/updatepage" route, the app looks through the records to find the corresponding document.
app.post("/updatepage", function(req, res) {
  const updateSerialID = req.body.inputUpdate;
  Xconn.find({
    _id: updateSerialID
  }, function(err, result) {
    res.render("updatepage.ejs", {
      connection: result,
      skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
    });
  });
});


// Search results.
app.post("/result", function(req, res) {
  const typeOfData = _.toLower(req.body.queryClusterAZ);
  const valueOfData = _.toLower(req.body.inputForm).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const queryOption = _.toLower(req.body.queryOption);
  const queryParameter = _.toLower(req.body.queryParameter);
  const query = {};
  const searchTitle = _.toUpper(valueOfData);
  query[typeOfData] = valueOfData;
  if (queryOption == "allrecords") {
    Xconn.find(query, function(err, connection) {
      res.render("result.ejs", {
        connection: connection,
        valueOfData: searchTitle,
        queryClusterAZ: typeOfData,
        skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
      });
    });
    // If queryOption is not allrecords, it means that the user has selected a specific option for their search.
  } else {
    query[queryOption] = queryParameter;
    Xconn.find(query, function(err, connection) {
      res.render("result.ejs", {
        connection: connection,
        valueOfData: searchTitle,
        queryClusterAZ: typeOfData,
        skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
      });
    });

    const searchTitle = _.toUpper(valueOfData)
    console.log(query);
    console.log(typeOfData, valueOfData, queryParameter);
  }
});



app.post("/add", function(req, res) {
  const serialId = _.toLower(req.body.serialId);
  const serviceProvider = _.toLower(req.body.serviceProvider);
  const patchPanel = _.toLower(req.body.patchPanel);
  const port = _.toLower(req.body.port);
  const device = _.toLower(req.body.device);
  const interface = _.toLower(req.body.interface);
  const bandwidth = _.toLower(req.body.bandwidth);

  if (device[5] == "-") {
    var az = device.slice(0, 5);
  } else {
    var az = device.slice(0, 4);
  }

  // Creates a circuit document with the values informed by the user.
  const circuit = new Xconn({
    _id: serialId,
    serviceprovider: serviceProvider.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    bandwidth: bandwidth,
    patchpanel: patchPanel,
    port: port,
    device: device,
    interface: interface,
    az: az,
    cluster: device.slice(0, 3)
  });

  circuit.save();

  res.redirect("/add");
});

app.post("/update", function(req, res) {
  const serialId = _.toLower(req.body.serialId);
  const serviceProvider = _.toLower(req.body.serviceProvider);
  const patchPanel = _.toLower(req.body.patchPanel);
  const port = _.toLower(req.body.port);
  const device = _.toLower(req.body.device);
  const interface = _.toLower(req.body.interface);
  const bandwidth = _.toLower(req.body.bandwidth);


  console.log(serialId, serviceProvider, patchPanel, port, device, interface, bandwidth);

  // Looking for a document with a specific ID and updating its parameters
  Xconn.findOneAndUpdate({ _id:serialId }, {_id: serialId, serviceprovider: serviceProvider, bandwidth: bandwidth, patchpanel: patchPanel, port: port, device: device, interface: interface}, function(err, result){
    console.log("Record updated");
  });

  res.redirect("/search");
});



// Opening the server for connections.
app.listen(3000, function() {
  console.log("Server running on port 3000");
});
