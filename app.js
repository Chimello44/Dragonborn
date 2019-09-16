const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");

const json2xls = require('json2xls');

const fs = require("fs");

const favicon = require('serve-favicon');

const app = express();

app.use(favicon(__dirname + '/public/images/favicon.ico'));

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
  patchpanelport: String,
  az: String,
  cluster: String,
  ticket: String
});

const patchPanelSchema = new mongoose.Schema({
  _patchpanel: {
    type: String,
    required: true,
    // index: true
  },
  capacity: Number,
  rack: String,
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



function addCircuit(serialId, serviceProvider, bandwidth, patchPanel, patchPanelPort, device, interface, cluster, az, ticket, actionAddUpdate, res) {
  Az.countDocuments({
    _id: az
  }, function(err, foundAz) {
    if (foundAz === 1) {
      PatchPanel.countDocuments({_patchpanel: patchPanel, az: az}, function(err, foundPatchPanel) {
        if (foundPatchPanel === 1) {
          PatchPanel.findOne({_patchpanel: patchPanel, az: az}, function(err, doc) {

            if ((doc.capacity > 0) && (actionAddUpdate === "addcircuit")) {
              Xconn.countDocuments({_circuit: serialId, az: az}, function(err, doc) {
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
                    cluster: device.slice(0, 3),
                    ticket: ticket
                  });
                  newCircuit.save();
                  res.render("success.ejs", {
                    success: "Circuit ID " + _.toUpper(newCircuit._circuit) + " saved for " + _.toUpper(newCircuit.az + "."),
                    route: "/addcircuit"
                  });
                  PatchPanel.findOneAndUpdate({az: az, _patchpanel: patchPanel}, {$inc: {capacity: -1}}, function(err, doc) {});
                } else {
                  res.render("fail.ejs", {
                    fail: "Circuit ID " + _.toUpper(serialId) + " already registered in the database for " + _.toUpper(az) + ".",
                    route: "/addcircuit"
                  });
                }
              });

            } else if (actionAddUpdate == "updatecircuit") {
              if (foundPatchPanel === 1) {
                Xconn.findOneAndUpdate({_circuit: serialId, az: az}, {
                  _circuit: serialId,
                  serviceprovider: serviceProvider,
                  bandwidth: bandwidth,
                  patchpanel: patchPanel,
                  patchpanelport: patchPanelPort,
                  device: device,
                  interface: interface,
                  az: az,
                  cluster: device.slice(0, 3)
                }, function(err, doc) {
                  res.render("success.ejs", {
                    success: "Circuit ID " + _.toUpper(serialId) + " updated.",
                    route: "/update"
                  });
                });
              } else {
                res.render("fail.ejs", {
                  success: _.toUpper(patchPanel) + " is not registered for " + _.toUpper(az),
                  route: "/update"
                })
              }

            } else {
              res.render("fail.ejs", {
                fail: "No capacity to deploy new circuits on panel " + _.toUpper(patchPanel) + ".",
                route: "/add"
              });
            }
          });
        } else {
          res.render("fail.ejs", {
            fail: _.toUpper(patchPanel) + " is not registered for " + _.toUpper(az),
            route: "/add"
          });
        }
      });
    } else {
      res.render("fail.ejs", {
        fail: _.toUpper(az) + " is not registered.",
        route: "/add"
      });
    }
  });
}




// POST METHODS.

// Search results route.
app.post("/result", function(req, res) {
  const typeOfData = _.toLower(req.body.queryClusterAZ);
  const valueOfData = _.toLower(req.body.inputForm).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const queryOption = _.toLower(req.body.queryOption);
  const queryParameter = _.toLower(req.body.queryParameter);
  const ticket = _.toLower(req.body.ticket);

  const query = {};
  const searchTitle = _.toUpper(valueOfData);
  query[typeOfData] = valueOfData;
  if (queryOption == "allrecords") {
    Xconn.countDocuments(query, function(err, docs){
      if (docs === 0) {
        res.render("fail.ejs", {
          fail: "No data for your search. Perhaps your AZ does not have any circuits registered.",
          route: "/search"
        });
      } else {
        Xconn.find(query, function(err, connection) {
          res.render("result.ejs", {
            connection: connection,
            valueOfData: searchTitle,
            queryClusterAZ: typeOfData,
            skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
          });
        });
      }
    });

    // If queryOption is not allrecords, it means that the user has selected a specific option for their search.
  } else {
    query[queryOption] = queryParameter;
    Xconn.countDocuments(query, function(err, docs){
      if (docs === 0) {
        res.render("fail.ejs", {
          fail: "No data for your search. Make sure to provide an ID that match the filter specified.",
          route: "/search"
        });
      } else {
        Xconn.find(query, function(err, connection) {
          res.render("result.ejs", {
            connection: connection,
            valueOfData: searchTitle,
            queryClusterAZ: typeOfData,
            skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
          });
        });
      }
    });

    const searchTitle = _.toUpper(valueOfData)
  }
});




app.post("/resultpptracker", function(req, res){
  const az = _.toLower(req.body.inputForm);
  const pp = _.toLower(req.body.pp);

  const query = {};
  query["az"] = az;

  // Check whether the AZ has patch-panels
  PatchPanel.countDocuments(query, function(err, docs){
    if (docs === 0) {
      res.render("fail.ejs", {
        fail: _.toUpper(az) + " doesn't have Patch-Panels registered.",
        route: "/search"
      });
    } else {
      // If there's no filter, the search looks for all panels inside the AZ.
      if (pp === "") {
        PatchPanel.find(query, function(err, docs){
          res.render("resultpptracker.ejs", {
            patchpanel: docs,
            az: _.toUpper(az)
          });
        });
      } else {
        // If a filter is specified, the search looks for the specific panel in that AZ.
        query["_patchpanel"] = pp;
        PatchPanel.find(query, function(err, docs){
          res.render("resultpptracker.ejs", {
            patchpanel: docs,
            az: az
          });
        });
      }
    }
  });

});




// Add circuit route.
app.post("/addcircuit", function(req, res) {
  const serialId = _.toLower(req.body.serialId);
  const serviceProvider = _.toLower(req.body.serviceProvider).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const bandwidth = req.body.bandwidth;
  const patchPanel = _.toLower(req.body.patchPanel);
  const patchPanelPort = _.toLower(req.body.patchPanelPort);
  const device = _.toLower(req.body.device);
  const interface = _.toLower(req.body.interface);
  const ticket = _.toLower(req.body.ticket);

  const cluster = device.slice(0, 3);

  if (device[5] === "-") {
    var az = _.toLower(device.slice(0, 5));
  } else {
    var az = _.toLower(device.slice(0, 4));
  }

  const actionAddUpdate = req.body.page;

  // function Add Circuit
  addCircuit(serialId, serviceProvider, bandwidth, patchPanel, patchPanelPort, device, interface, cluster, az, ticket, actionAddUpdate, res);

});




// Add Patch-Panel route.
app.post("/addpp", function(req, res) {
  const patchPanel = _.toLower(req.body.patchPanelId);
  const capacity = req.body.capacity;
  const rack = _.toLower(req.body.rack);

  if (rack[4] === ".") {
    var az = _.toLower(rack.slice(0, 4));
  } else {
    var az = _.toLower(rack.slice(0, 5));
  }

  const cluster = az.slice(0, 3);

  Az.countDocuments({_id: az}, function(err, foundAz) {
    if (foundAz === 0) {
      res.render("fail.ejs", {
        fail: "There's no AZ for panel " + _.toUpper(patchPanel),
        route: "/add"
      });
    } else if (foundAz === 1) {
      PatchPanel.countDocuments({_patchpanel: patchPanel, az: az}, function(err, foundPatchPanel) {
        if (foundPatchPanel === 0) {
          const newPatchPanel = new PatchPanel({
            _patchpanel: patchPanel,
            capacity: capacity,
            rack: rack,
            az: az,
            cluster: cluster
          });
          newPatchPanel.save();
          res.render("success.ejs", {
            success: _.toUpper(patchPanel) + " created for " + _.toUpper(az),
            route: "/add"
          });
        } else {
          res.render("success.ejs", {
            success: "Panel " + _.toUpper(patchPanel) + " already exists for " + _.toUpper(az) + ".",
            route: "/add"
          });
        }
      });
    }
  });
});




// Add AZ route.
app.post("/addAz", function(req, res) {
  const az = _.toLower(req.body.az);
  const cluster = _.toLower(az.slice(0, 3));

  Cluster.countDocuments({
    _id: _.toLower(az.slice(0, 3))
  }, function(err, foundCluster) {
    if (foundCluster === 1) {

      Az.countDocuments({
        _id: _.toLower(az)
      }, function(err, foundAz) {
        if (foundAz === 0) {
          const newAz = new Az({
            _id: _.toLower(az),
            cluster: _.toLower(az.slice(0, 3))
          });
          newAz.save();
          res.render("success.ejs", {
            success: _.toUpper(az) + " added to database.",
            route: "/add"
          });

        } else if (foundAz === 1) {
          res.render("fail.ejs", {
            fail: _.toUpper(az) + " already created.",
            route: "/add"
          });

        } else {
          res.render("fail.ejs", {
            fail: _.toUpper(az) + " duplicated.",
            route: "/add"
          });
        }
      });

    } else if (foundCluster === 0) {
      const newCluster = new Cluster({
        _id: _.toLower(cluster)
      });
      newCluster.save();

      const newAz = new Az({
        _id: _.toLower(az),
        cluster: _.toLower(az.slice(0, 3))
      });
      newAz.save();
      res.render("success.ejs", {
        success: _.toUpper(az) + " added to database.",
        route: "/add"
      });
    }
  });
});




// Collect the serial ID from the circuit that will be updated.
app.post("/updatecircuit", function(req, res) {
  const updateSerialID = _.toLower(req.body.inputUpdate);
  const inputForm = _.toLower(req.body.inputForm);
  Xconn.find({_circuit: updateSerialID, az: inputForm}, function(err, result) {
    if (err) {
      console.log(err);
    } else {
      if (result.length === 0) {
        res.render("fail.ejs", {
          fail: "Circuit ID " + updateSerialID + " hasn't been found.",
          route: "/update"
        });
      } else if (result.length === 1) {
        res.render("updatecircuit.ejs", {
          connection: result,
          skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
        });
      } else {
        res.render("fail.ejs", {
          fail: "Circuit ID " + updateSerialID + " is duplicated.",
          route: "/update"
        });
      }
    }

  });
});




// Update circuit route.
app.post("/update", function(req, res) {
  const serialId = _.toLower(req.body.serialId);
  const serviceProvider = _.toLower(req.body.serviceProvider);
  const bandwidth = req.body.bandwidth;
  const patchPanel = _.toLower(req.body.patchPanel);
  const patchPanelPort = _.toLower(req.body.port)
  const device = _.toLower(req.body.device);
  const interface = _.toLower(req.body.interface);

  const cluster = device.slice(0, 3);

  if (device[5] === "-") {
    var az = _.toLower(device.slice(0, 5));
  } else {
    var az = _.toLower(device.slice(0, 4));
  }

  const actionAddUpdate = req.body.page;

  addCircuit(serialId, serviceProvider, bandwidth, patchPanel, patchPanelPort, device, interface, cluster, az, actionAddUpdate, res);
});




// Collect the circuit ID which will be decommissioned.
app.post("/delete", function(req, res) {
  const deleteSerialId = _.toLower(req.body.inputDelete);
  const az = _.toLower(req.body.az);
  Xconn.find({_circuit: deleteSerialId, az: az}, function(err, result) {
    if (err) {
      console.log(err);
    } else {
      if (result.length === 1) {
        res.render("deletecircuit.ejs", {
          connection: result
        });
      } else if (result.length === 0) {
        res.render("fail.ejs", {
          fail: "Circuit ID " + deleteSerialId + " hasn't been found.",
          route: "/delete"
        });
      } else {
        res.render("fail.ejs", {
          fail: "Circuit ID " + deleteSerialId + " is duplicated.",
          route: "/delete"
        });
      }
    }
  });
});




// Decommission circuit.
app.post("/deletecircuit", function(req, res) {
  const deleteSerialId = _.toLower(req.body.serialId);
  const patchPanel = _.toLower(req.body.patchPanel);
  const device = _.toLower(req.body.device);
  if (device[5] === "-") {
    var az = _.toLower(device.slice(0, 5));
  } else {
    var az = _.toLower(device.slice(0, 4));
  }




  Xconn.findOneAndDelete({
    _circuit: deleteSerialId
  }, function(err, doc) {
    PatchPanel.findOneAndUpdate({
      az: az,
      _patchpanel: patchPanel
    }, {
      $inc: {
        capacity: 1
      }
    }, function(err, doc) {});
    res.render("success.ejs", {
      success: "Circuit ID " + doc._circuit + " has been decommissioned.",
      route: "/delete"
    });
  });
});




// Generates a report
app.post("/generatereport", function(req, res) {
  const report = _.toLower(req.body.queryClusterAZ);
  const filter = _.toLower(req.body.inputForm);
  const result = [];

  if (report === "cluster") {

    Cluster.countDocuments({_id: filter}, function(err, foundCluster){
      if (foundCluster === 0) {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is not registered.",
          route: "/report"
        });
      } else if (foundCluster === 1) {
        Xconn.countDocuments({cluster: filter}, function(err, foundCircuits){
          if(foundCircuits === 0){
            res.render("fail.ejs", {
              fail: _.toUpper(filter) + " doesn't have cross-connect circuits registered.",
              route: "/report"
            });
          } else {
            Xconn.find({cluster: filter}, function(err, docs) {

              // https://stackabuse.com/reading-and-writing-csv-files-with-node-js/

              // https://www.npmjs.com/package/json2xls
              // https://stackoverflow.com/questions/42003340/node-json2xls-downloadable-file
              // https://stackoverflow.com/questions/7288814/download-a-file-from-nodejs-server-using-express

              app.use(json2xls.middleware);
              var xls = json2xls(docs,{
                fields: ['az', 'cluster', '_circuit', 'serviceprovider', 'bandwidth', 'device', 'interface', 'patchpanel', "patchpanelport"]
              });
              res.setHeader('Content-disposition', 'attachment; filename=report.xlsx');
              res.setHeader('Content-type', 'text/xlsx');
              fs.writeFileSync("report.xlsx", xls, "binary");
              res.download("report.xlsx", "report.xlsx");

            });
          }
        });
      } else {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is duplicated.",
          route: "/report"
        });
      }
    });

  } else {

    Az.countDocuments({_id: filter}, function(err, foundAz){
      if (foundAz === 0) {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is not registered.",
          route: "/report"
        });
      } else if (foundAz === 1) {
        Xconn.countDocuments({az: filter}, function(err, foundCircuits){
          if (foundCircuits === 0) {
            res.render("fail.ejs", {
              fail: _.toUpper(filter) + " doesn't have cross-connect circuits registered.",
              route: "/report"
            });
          } else {
            Xconn.find({az: filter}, function(err, docs){
              app.use(json2xls.middleware);
              var xls = json2xls(docs,{
                fields: ['az', 'cluster', '_circuit', 'serviceprovider', 'bandwidth', 'device', 'interface', 'patchpanel', "patchpanelport"]
              });
              res.setHeader('Content-disposition', 'attachment; filename=report.xlsx');
              res.setHeader('Content-type', 'text/xlsx');
              fs.writeFileSync("report.xlsx", xls, "binary");
              res.download("report.xlsx", "report.xlsx");
            });
          }
        });
      } else {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is duplicated.",
          route: "/report"
        });
      }
    });
  }
});




// GET METHODS

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

app.get("/searchcircuit", function(req, res){
  res.render("searchcircuit.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/searchpp", function(req, res){
  res.render("searchpp.ejs", {
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

app.get("/addaz", function(req, res) {
  res.render("addaz.ejs");
});

// Method to decommission circuit.
app.get("/delete", function(req, res) {
  res.render("delete.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/report", function(req, res) {
  res.render("report.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});




app.listen(3000, function() {
  console.log("Server running on port 3000");
});
