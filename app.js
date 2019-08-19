const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();

// Creating the engine views to render EJS files from "views" folder.
app.set('views engine', 'ejs');

// Making the app use the body-parser middleware to parse data from forms.
app.use(bodyParser.urlencoded({extended: true}));

// Configuring express server to serve static files (css, images, javascript) from "public" folder.
app.use(express.static("public"));

// Connecting to MongoDB server cross-connect-circuits.
mongoose.connect("mongodb://localhost:27017/cross-connect-circuits", { useNewUrlParser: true });

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
  "Believe, believe, the dragonborn comes",
  "Beware, beware, the dragonborn comes",
  "Dovahkiin, dovahkiin, naal ok zin los vahriin",
  "I used to be an adventurer like you, then I took an arrow to the knee.",
  "Nords are so serious about beards. So many beards. M'aiq thinks they wish they had glorious manes like Khajiit.",
  "What is better? To be born good, or to overcome your evil nature through great effort?",
  "Drem. Patience. There are formalities that must be observed, at the first meeting of two of the dov. By long tradition, the elder speaks first. Hear my Thu'um! Feel it in your bones. Match it, if you are Dovahkiin!",
  "Fus Ro Dah!",
  "My favorite drinking buddy! Let's get some mead.",
  "You do not even know our tongue, do you? Such arrogance, to dare take for yourself the name of Dovah!",
  "In their tongue he is Dovahkiin - Dragonborn",
  "We drink to our youth, for days come and gone. For the Age of Aggression is just about done",
  "We're the children of Skyrim, and we fight all our lives"
];

function randomSkyrimPhrase(max){
  return Math.floor(Math.random() * max);
}


// Creating Model, which is the constructor method.
const Xconn = mongoose.model("Connection", circuitSchema);


// This action is triggered when a request is received at the home route.
app.get("/", function(req, res){
  res.render("index.ejs");
});


app.get("/search", function(req, res){
  res.render("search.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(12)]
  });

});

app.get("/add", function(req, res){
  res.render("add.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(12)]
  });
});

app.get("/update", function(req, res){
  res.render("update.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(12)]
  });
});


// Search results.
app.post("/result", function(req, res){
  const typeOfData = _.toLower(req.body.query);
  const valueOfData = _.toLower(req.body.inputForm);
  const query = {};
  query[typeOfData] = valueOfData.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const searchTitle = _.toUpper(valueOfData)
  console.log(query);

  Xconn.find(query, function(err, connection){
    res.render("result.ejs", {
      connection: connection,
      valueOfData: searchTitle,
      skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(12)]
    });
  });
});


app.post("/add", function(req, res){
  const serialId = _.toLower(req.body.serialId);
  const serviceProvider = _.toLower(req.body.serviceProvider);
  const patchPanel = _.toLower(req.body.patchPanel);
  const port = _.toLower(req.body.port);
  const device = _.toLower(req.body.device);
  const interface = _.toLower(req.body.interface);
  const bandwidth = _.toLower(req.body.bandwidth);
  // const az = _.toLower(req.body.az);

  if (device[5] == "-") {
    var az = device.slice(0,5);
  } else {
    var az = device.slice(0,4);
  }

  const circuit = new Xconn({
    _id: serialId,
    serviceprovider: serviceProvider.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    bandwidth: bandwidth,
    patchpanel: patchPanel,
    port: port,
    device: device,
    interface: interface,
    az: az,
    cluster: device.slice(0,3)
  });

  //circuit.save();

  res.redirect("/add");
});


// Opening the server for connections.
app.listen(3000, function(){
  console.log("Server running on port 3000");
});
