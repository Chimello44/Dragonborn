const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const autoIncrement = require("mongoose-auto-increment");

var async = require("async");

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

// const clusters = [
//   "ARN", "BJS", "BOM", "CDG", "CMH", "DCA", "DUB", "FRA", "GIG",  "IAD", "ICN", "KIX", "HKG", "LHR", "LCK", "LUX", "MXP", "NRT", "OSU", "PDT", "PDX", "PEK", "SEA", "SFO", "SIN", "SYD", "YUL", "ZHY"
// ];
//
// const sites = ["gru1", "gru2", "gru3", "iad50"];





// Creating the Model Schema, the structure in which the documents will be saved.
const circuitSchema = new mongoose.Schema({
  _circuit: {
    type: String,
    required: true,
    // unique: true
  },
  serviceprovider: String,
  bandwidth: Number,
  device: String,
  interface: String,
  patchpanel: String,
  patchpanelport: Number,
  az: String,
  cluster: String
});

const patchPanelSchema = new mongoose.Schema({
  _patchpanel: {
    type: String,
    required: true,
    // index: true
  },
  capacity: Number,
  az: String,
  cluster: String
});

const azSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  cluster: String
});

const clusterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  }
});




// Creating  the Model, which is the constructor method.
const Xconn = mongoose.model("Circuit", circuitSchema);

const PatchPanel = mongoose.model("Panel", patchPanelSchema);

const Az = mongoose.model("Site", azSchema);

const Cluster = mongoose.model("Cluster", clusterSchema);











app.post("/addAz", function(req, res){
  const az = _.toLower(req.body.az);
  const cluster = _.toLower(az.slice(0,3));

  Cluster.countDocuments({_id: _.toLower(az.slice(0,3))}, function(err, foundCluster){
    if (foundCluster === 1) {

      Az.countDocuments({_id: _.toLower(az)}, function(err, foundAz){
        if (foundAz === 0) {
          const newAz = new Az({
            _id: _.toLower(az),
            cluster: _.toLower(az.slice(0,3))
          });
          newAz.save();
          console.log(_.toUpper(az) + " added to database.");

        } else if (foundAz === 1) {
          console.log(_.toUpper(az) + " already created.");

        } else {
          console.log(_.toUpper(az) + " duplicated.");
        }
      });

    } else if (foundCluster === 0) {
      const newCluster = new Cluster({
        _id: _.toLower(cluster)
      });
      newCluster.save();
      console.log(_.toUpper(cluster) + " created.");

      const newAz = new Az({
        _id: _.toLower(az),
        cluster: _.toLower(az.slice(0,3))
      });
      newAz.save();
      console.log(_.toUpper(az) + " added to database.");
    }
  });
});





app.post("/addcircuit", function(req, res){
  const serialId = _.toLower(req.body.serialId);
  const serviceProvider = _.toLower(req.body.serviceProvider).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const bandwidth = req.body.bandwidth;
  const patchPanel = _.toLower(req.body.patchPanel);
  const patchPanelPort = _.toLower(req.body.patchPanelPort);
  const device = _.toLower(req.body.device);
  const interface = _.toLower(req.body.interface);

  const cluster = device.slice(0,3);

  if (device[5] === "-") {
    var az = _.toLower(device.slice(0,5));
  } else {
    var az = _.toLower(device.slice(0,4));
  }

  Az.countDocuments({_id: az}, function(err, foundAz){
    if (foundAz === 1) {
      PatchPanel.countDocuments({_patchpanel: patchPanel, az: az}, function(err, foundPatchPanel){
        if (foundPatchPanel === 1) {
          PatchPanel.findOne({_patchpanel: patchPanel, az: az}, function(err, doc){
            // console.log(doc.capacity);
            if (doc.capacity > 0) {
              Xconn.countDocuments({_circuit: serialId, az: az}, function(err, doc){
                if (doc === 0) {
                  const newCircuit = new Xconn({
                    _circuit: serialId,
                    serviceprovider: serviceProvider,
                    bandwidth: bandwidth,
                    patchpanel: patchPanel,
                    patchpanelport: patchPanelPort,
                    device: device,
                    interface: interface,
                    az: az,
                    cluster: device.slice(0,3)
                  });
                  newCircuit.save();
                  console.log(newCircuit._circuit + ": circuit saved for " + newCircuit.az);
                  PatchPanel.findOneAndUpdate({az: az, _patchpanel: patchPanel}, { $inc: {capacity: -1} }, function(err, doc){
                    console.log("Current capacity for " + newCircuit.patchpanel + " in " + newCircuit.az + " is: " + doc.capacity);
                  });
                } else {
                  console.log("Circuit already registered.");
                }
              });

            } else {
              console.log("No capacity to deploy new circuits.");
            }
          });
        } else {
          console.log(patchPanel + " is not registered for " + az);
        }
      });
    } else {
      console.log(az + " is not registered.");
    }
  });

});



app.post("/addpp", function(req, res){
  const patchPanel = _.toLower(req.body.patchPanelId);
  const capacity = req.body.capacity;
  const az = _.toLower(req.body.az);
  const cluster = az.slice(0,3);

  Az.countDocuments({_id: az}, function(err, foundAz){
    if (foundAz === 0) {
      console.log("There's no AZ for this patch-panel.");
    } else if (foundAz === 1) {
      PatchPanel.countDocuments({_patchpanel: patchPanel, az: az}, function(err, foundPatchPanel){
        if (foundPatchPanel === 0) {
          const newPatchPanel = new PatchPanel({
            _patchpanel: patchPanel,
            capacity: capacity,
            az: az,
            cluster: cluster
          });
          newPatchPanel.save();
          console.log(patchPanel + " created for " + az);
        } else {
          console.log("Patch-Panel already exists for " + az);
        }
      });
    }
  });
});





app.post("/update", function(req, res){
  const bandwidth = req.body.bandwidth;
  const patchPanel = req.body.patchPanel;
  const port = req.body.port;
  const device = req.body.device;
  const interface = req.body.interface;

  Xconn.findOneAndUpdate({})
});





// When a serial ID is received at the "/updatepage" route, the app looks through the records to find the corresponding document.
app.post("/updatecircuit", function(req, res) {
  const updateSerialID = req.body.inputUpdate;
  console.log(updateSerialID);
  Xconn.find({
    _circuit: updateSerialID
  }, function(err, result) {
    res.render("updatecircuit.ejs", {
      connection: result,
      skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
    });
  });
});





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
  res.render("addpp.ejs");
});

app.get("/update", function(req, res) {
  res.render("update.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/addaz", function(req, res){
  res.render("addaz.ejs");
});





// app.post("/add", function(req, res) {
//   const serialId = _.toLower(req.body.serialId);
//   const serviceProvider = _.toLower(req.body.serviceProvider);
//   const patchPanel = _.toLower(req.body.patchPanel);
//   const port = _.toLower(req.body.port);
//   const device = _.toLower(req.body.device);
//   const interface = _.toLower(req.body.interface);
//   const bandwidth = _.toLower(req.body.bandwidth);
//   const cluster = device.slice(0, 3);
//
//   if (device[5] == "-") {
//     var az = device.slice(0, 5);
//   } else {
//     var az = device.slice(0, 4);
//   }
//
//   Cluster.findOne({
//     _id: cluster
//   }, function(err, foundCluster) {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log("Cluster: " + foundCluster);
//     }
//   })
// });









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





// Opening the server for connections.
app.listen(3000, function() {
  console.log("Server running on port 3000");
});
