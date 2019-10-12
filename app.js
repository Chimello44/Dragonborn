const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const fs = require('fs')

const csv = require('csv-parser')

const favicon = require('serve-favicon');

const formidable = require("formidable")

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




// Creating the Model Schema, the structure in which the documents will be saved.
const circuitSchema = new mongoose.Schema({
  _circuit: {
    type: String,
    required: true,
  },
  serviceprovider: String,
  bandwidth: Number,
  device: String,
  interface: String,
  rack: String,
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
  },
  capacity: Number,
  fullcapacity: Number,
  rack: String,
  az: String,
  cluster: String,
  type: String
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



function addCircuit(serialId, serviceProvider, bandwidth, patchPanel, oldPatchPanel, patchPanelPort, device, interface, cluster, az, oldAz, ticket, actionAddUpdate, res) {
  Az.countDocuments({_id: az}, function(err, foundAz) {
    if (foundAz === 1) {
      if (az !== oldAz) {
        res.render("fail.ejs", {
          fail: "Must be the same AZ",
          route: "/update"
        });
      } else {
        PatchPanel.countDocuments({_patchpanel: patchPanel, az: az}, function(err, foundPatchPanel) {
          if (foundPatchPanel === 1) {
            PatchPanel.findOne({_patchpanel: patchPanel, az: az}, function(err, pp) {
              const rack = pp.rack;
              if ((pp.capacity > 0) && (actionAddUpdate === "addcircuit")) {
                Xconn.countDocuments({_circuit: serialId, az: az}, function(err, doc) {
                  if (doc === 0) {
                    const newCircuit = new Xconn({
                      _circuit: serialId,
                      serviceprovider: serviceProvider,
                      bandwidth: bandwidth,
                      rack: rack,
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
                      success: "Circuit ID " + _.toUpper(newCircuit._circuit) + " saved for " + _.toUpper(newCircuit.az),
                      route: "/addcircuit"
                    });
                    PatchPanel.findOneAndUpdate({az: az, _patchpanel: patchPanel}, {$inc: {capacity: -1}}, function(err, ppupdate) {});
                  } else {
                    res.render("fail.ejs", {
                      fail: "Circuit ID " + _.toUpper(serialId) + " already registered in the database for " + _.toUpper(az),
                      route: "/addcircuit"
                    });
                  }
                });

              } else if (actionAddUpdate === "updatecircuit") {
                console.log(oldAz);
                if (oldAz === az) {
                  if (oldPatchPanel === patchPanel) {
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
                    }, function(err, ppupdate) {
                      PatchPanel.findOneAndUpdate({az: az, _patchpanel: patchPanel}, function(err, doc) {});
                      res.render("success.ejs", {
                        success: "Circuit ID " + _.toUpper(serialId) + " updated",
                        route: "/update"
                      });
                    });
                  } else {
                    if (pp.capacity > 0) {
                      const rack = pp.rack;
                      PatchPanel.findOneAndUpdate({az: az, _patchpanel: oldPatchPanel}, {$inc: {capacity: 1}}, function(err, doc) {});

                      Xconn.findOneAndUpdate({_circuit: serialId, az: az}, {
                        _circuit: serialId,
                        serviceprovider: serviceProvider,
                        bandwidth: bandwidth,
                        rack: rack,
                        patchpanel: patchPanel,
                        patchpanelport: patchPanelPort,
                        device: device,
                        interface: interface,
                        az: az,
                        cluster: device.slice(0, 3)
                      }, function(err, doc) {
                        PatchPanel.findOneAndUpdate({az: az, _patchpanel: patchPanel}, {$inc: {capacity: -1}}, function(err, doc) {});
                        res.render("success.ejs", {
                          success: "Circuit ID " + _.toUpper(serialId) + " updated",
                          route: "/update"
                        });
                      });
                    } else {
                      res.render("fail.ejs", {
                        fail: "No capacity to deploy a new circuit on panel " + _.toUpper(patchPanel),
                        route: "/update"
                      });
                    }

                  }
                } else {
                  res.render("fail.ejs", {
                    fail: "To update a cross-connect, the AZ must be the same",
                    route: "/update"
                  });
                }
                if (foundPatchPanel === 1) {


                } else {
                  res.render("fail.ejs", {
                    success: _.toUpper(patchPanel) + " is not registered for " + _.toUpper(az),
                    route: "/update"
                  });
                }
              } else {
                res.render("fail.ejs", {
                  fail: "No capacity to deploy a new circuit on panel " + _.toUpper(patchPanel),
                  route: "/update"
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
      }
    } else {
      res.render("fail.ejs", {
        fail: _.toUpper(az) + " is not registered",
        route: "/add"
      });
    }
  });
}




// POST METHODS.

let downloadSearch;
// Search results route.
app.post("/result", function(req, res) {

  const csvWriter = createCsvWriter({
    path: 'report.csv',
    header: [
      {id: 'cluster', title: 'Cluster'},
      {id: 'az', title: 'AZ'},
      {id: '_circuit', title: 'Cross-Connect ID'},
      {id: 'serviceprovider', title: 'Service Provider / Peer'},
      {id: 'bandwidth', title: 'Bandwidth (Gbps)'},
      {id: 'device', title: 'Device'},
      {id: 'interface', title: 'Interface'},
      {id: 'patchpanel', title: 'Patch-Panel'},
      {id: 'patchpanelport', title: 'Patch-Panel Port'},
      {id: 'rack', title: 'Rack'},
      {id: 'ticket', title: "Ticket Number"}
    ]
  });

  fs.truncate(__dirname + '/report.csv', 0, function(){});

  const typeOfData = _.toLower(req.body.queryClusterAZ);
  const valueOfData = _.toLower(req.body.inputForm);
  const queryOption = _.toLower(req.body.queryOption);
  const queryParameter = _.toLower(req.body.queryParameter).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ticket = _.toLower(req.body.ticket);

  const query = {};
  const searchTitle = _.toUpper(valueOfData);
  query[typeOfData] = valueOfData;

  if (queryOption == "allrecords") {

    Az.countDocuments({_id: valueOfData}, function(err, azNum){
      if (azNum === 1) {
        Xconn.countDocuments(query, function(err, docs){
          if (docs === 0) {
            res.render("fail.ejs", {
              fail: "AZ " + _.toUpper(valueOfData) + " doesn't have Cross-Connects registered",
              route: "/search"
            });
          } else {
            Xconn.find(query, function(err, connection) {
              // const patchpanel = [];
              // patchpanel.push(foundPP);
              downloadSearch = connection;
              csvWriter.writeRecords(downloadSearch);
              // console.log(downloadSearch);
              res.render("result.ejs", {
                connection: connection,
                valueOfData: searchTitle,
                queryClusterAZ: typeOfData,
                skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
              });
              // connection.forEach((circuit) => {
              //   PatchPanel.findOne({az: valueOfData, _patchpanel: circuit.patchpanel}, function(err, foundPP){
              //     patchpanel.push(foundPP);
              //     downloadSearch = connection;
              //     csvWriter.writeRecords(downloadSearch);
              //     // console.log(downloadSearch);
              //     res.render("result.ejs", {
              //       connection: connection,
              //       patchpanel: patchpanel,
              //       valueOfData: searchTitle,
              //       queryClusterAZ: typeOfData,
              //       skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
              //     });
              //   });
              // });
            });
          }
        });
      } else if (azNum > 1) {
        res.render("fail.ejs", {
          fail: "AZ " + _.toUpper(valueOfData) + " is duplicated",
          route: "/search"
        });
      } else {
        res.render("fail.ejs", {
          fail: "AZ " + _.toUpper(valueOfData) + " is not registered",
          route: "/search"
        });
      }
    });


    // If queryOption is not allrecords, it means that the user has selected a specific option for their search.
  } else {
    query[queryOption] = queryParameter;
    Xconn.countDocuments(query, function(err, docs){
      if (docs === 0) {
        res.render("fail.ejs", {
          fail: "No data for your search",
          route: "/searchcircuit"
        });
      } else {
        Xconn.find(query, function(err, connection) {
          downloadSearch = connection;
          csvWriter.writeRecords(downloadSearch);
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
  const type = req.body.connectionType;

  const csvWriter = createCsvWriter({
    path: 'report.csv',
    header: [
      {id: 'cluster', title: 'Cluster'},
      {id: 'az', title: 'AZ'},
      {id: '_patchpanel', title: 'Patch-Panel ID'},
      {id: 'capacity', title: 'Current Capacity'},
      {id: 'fullcapacity', title: 'Full Capacity'},
      {id: 'rack', title: 'Rack'},
      {id: 'type', title: 'Connection Type'}
    ]
  });

  fs.truncate(__dirname + '/report.csv', 0, function(){});

  const query = {};
  query["az"] = az;

  // Check whether the AZ has patch-panels
  PatchPanel.countDocuments(query, function(err, docs){
    if (docs === 0) {
      res.render("fail.ejs", {
        fail: _.toUpper(az) + " doesn't have Patch-Panels registered",
        route: "/search"
      });
    } else {
      // If there's no filter, the search looks for all panels inside the AZ.
      if (pp === "" && type === "") {
        PatchPanel.find(query, function(err, docs){
          downloadSearch = docs;
          csvWriter.writeRecords(downloadSearch);
          res.render("resultpptracker.ejs", {
            patchpanel: docs,
            az: _.toUpper(az)
          });
        }).sort({_patchpanel: 1});
      } else if (pp !== "" && type !== "") {
        // If a filter is specified, the search looks for the specific panel in that AZ.
        query["_patchpanel"] = pp;
        query["type"] = type;
        PatchPanel.countDocuments(query, function(err, docs){
          if (docs === 0) {
            res.render("fail.ejs", {
              fail: _.toUpper(az) + " doesn't have a Patch-Panel with " + _.toUpper(type) + " connections under the ID " + _.toUpper(pp),
              route: "/search"
            });
          } else {
            PatchPanel.find(query, function(err, docs){
              downloadSearch = docs;
              csvWriter.writeRecords(downloadSearch);
              res.render("resultpptracker.ejs", {
                patchpanel: docs,
                az: az
              });
            });
          }
        });
      } else if (pp === "" && type !== ""){
        query["type"] = type;
        PatchPanel.countDocuments(query, function(err, docs){
          if (docs === 0) {
            res.render("fail.ejs", {
              fail: _.toUpper(az) + " doesn't have a Patch-Panels with " + _.toUpper(type) + " connections",
              route: "/search"
            });
          } else {
            PatchPanel.find(query, function(err, docs){
              downloadSearch = docs;
              csvWriter.writeRecords(downloadSearch);
              res.render("resultpptracker.ejs", {
                patchpanel: docs,
                az: az
              });
            });
          }
        });
      } else {
        query["_patchpanel"] = pp;
        PatchPanel.countDocuments(query, function(err, docs){
          if (docs === 0) {
            res.render("fail.ejs", {
              fail: _.toUpper(az) + " doesn't have a Patch-Panel with the ID of " + _.toUpper(pp),
              route: "/search"
            });
          } else {
            PatchPanel.find(query, function(err, docs){
              downloadSearch = docs;
              csvWriter.writeRecords(downloadSearch);
              res.render("resultpptracker.ejs", {
                patchpanel: docs,
                az: az
              });
            });
          }
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
  let oldPatchPanel;
  let oldAz;

  const cluster = device.slice(0, 3);

  if (device[5] === "-") {
    var az = _.toLower(device.slice(0, 5));
  } else {
    var az = _.toLower(device.slice(0, 4));
  }

  const actionAddUpdate = req.body.page;

  // function Add Circuit
  addCircuit(serialId, serviceProvider, bandwidth, patchPanel, oldPatchPanel, patchPanelPort, device, interface, cluster, az, oldAz, ticket, actionAddUpdate, res);

});




// Add Patch-Panel route.
app.post("/addpp", function(req, res) {
  const patchPanel = _.toLower(req.body.patchPanelId);
  const capacity = req.body.capacity;
  const fullcapacity = req.body.capacity;
  const rack = _.toLower(req.body.rack);
  const type = req.body.connectionType;

  if (rack[4] === ".") {
    var az = _.toLower(rack.slice(0, 4));
  } else {
    var az = _.toLower(rack.slice(0, 5));
  }

  const cluster = az.slice(0, 3);

  Az.countDocuments({_id: az}, function(err, foundAz) {
    if (foundAz === 0) {
      res.render("fail.ejs", {
        fail: "No AZ registered with ID " + _.toUpper(az),
        route: "/add"
      });
    } else if (foundAz === 1) {
      PatchPanel.countDocuments({_patchpanel: patchPanel, az: az}, function(err, foundPatchPanel) {
        if (foundPatchPanel === 0) {
          const newPatchPanel = new PatchPanel({
            _patchpanel: patchPanel,
            capacity: capacity,
            fullcapacity: fullcapacity,
            rack: rack,
            az: az,
            cluster: cluster,
            type: type
          });
          newPatchPanel.save();
          res.render("success.ejs", {
            success: _.toUpper(patchPanel) + " created for " + _.toUpper(az),
            route: "/add"
          });
        } else {
          res.render("success.ejs", {
            success: "Panel " + _.toUpper(patchPanel) + " already exists for " + _.toUpper(az),
            route: "/addpp"
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
            success: _.toUpper(az) + " added to database",
            route: "/add"
          });

        } else if (foundAz === 1) {
          res.render("fail.ejs", {
            fail: _.toUpper(az) + " already created",
            route: "/add"
          });

        } else {
          res.render("fail.ejs", {
            fail: _.toUpper(az) + " duplicated",
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
        success: _.toUpper(az) + " added to database",
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
          fail: "Circuit ID " + updateSerialID + " hasn't been found",
          route: "/update"
        });
      } else if (result.length === 1) {
        res.render("updatecircuit.ejs", {
          connection: result,
          skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
        });
      } else {
        res.render("fail.ejs", {
          fail: "Circuit ID " + updateSerialID + " is duplicated",
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
  const ticket = _.toLower(req.body.ticket);

  var oldPatchPanel;
  var oldAz;

  const cluster = device.slice(0, 3);

  if (device[5] === "-") {
    var az = _.toLower(device.slice(0, 5));
  } else {
    var az = _.toLower(device.slice(0, 4));
  }

  Az.countDocuments({_id: az}, function(err, foundAz){
    console.log(foundAz);
    console.log(az);
    if (foundAz) {
      Xconn.findOne({_circuit: serialId, az: az}, function(err, doc){



          console.log("TESTE");
          console.log(doc);
          oldPatchPanel = doc.patchpanel;


          const actionAddUpdate = req.body.page;

          addCircuit(serialId, serviceProvider, bandwidth, patchPanel, oldPatchPanel, patchPanelPort, device, interface, cluster, az, oldAz, ticket, actionAddUpdate, res);



      });
    } else {
      res.render("fail.ejs", {
        fail: "AZ " + _.toUpper(az) + " not found",
        route: "/update"
      });
    }
  });




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
          fail: "Circuit ID " + deleteSerialId + " hasn't been found",
          route: "/delete"
        });
      } else {
        res.render("fail.ejs", {
          fail: "Circuit ID " + deleteSerialId + " is duplicated",
          route: "/delete"
        });
      }
    }
  });
});




app.post("/deletepp", function(req, res){
  const patchPanel = _.toLower(req.body.inputDelete);
  const az = _.toLower(req.body.az);

  PatchPanel.countDocuments({_patchpanel: patchPanel, az: az}, function(err, docs){
    if (!err) {
      if (docs === 1) {
        Xconn.countDocuments({patchpanel: patchPanel, az: az}, function(err, numOfConnections){
          if (numOfConnections === 0) {
            PatchPanel.find({_patchpanel: patchPanel, az: az}, function(err, pp){
              res.render("deletepatchpanel.ejs", {
                patchpanel: pp,
                az: _.toUpper(az)
              });
            });
          } else {
            res.render("fail.ejs", {
              fail: "Patch-Panel " + _.toUpper(patchPanel) + " in " + _.toUpper(az) + " is not empty, hence it cannot be decommissioned",
              route: "/delete"
            });
          }
        });
      } else if (docs > 1) {
        res.render("fail.ejs", {
          fail: "Patch-Panel " + _.toUpper(patchPanel) + " in " + _.toUpper(az) + " is duplicated",
          route: "/delete"
        });
      } else {
        res.render("fail.ejs", {
          fail: "There's no Patch-Panel " + _.toUpper(patchPanel) + " in " + _.toUpper(az),
          route: "/delete"
        });
      }
    } else {
      res.send(err);
    }
  });
});




app.post("/confirmdeletepp", function(req, res){
  const az = _.toLower(req.body.az);
  const patchpanel = _.toLower(req.body.patchpanel);

  PatchPanel.findOneAndDelete({_patchpanel: patchpanel, az: az}, function(err, doc){
    res.render("success.ejs", {
      success: "Patch-Panel " + _.toUpper(patchpanel) + " in " + _.toUpper(az) + " has been decommissioned",
      route: "/delete"
    })
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

  Xconn.findOneAndDelete({_circuit: deleteSerialId, az: az}, function(err, doc) {

    PatchPanel.findOneAndUpdate({az: az, _patchpanel: patchPanel}, {$inc: {capacity: 1}}, function(err, doc) {
      res.render("success.ejs", {
        success: "Cross-Connect ID " + _.toUpper(deleteSerialId) + " has been decommissioned in " + _.toUpper(az),
        route: "/delete"
      });
    });

  });
});




// Generates a report
app.post("/generatereport", function(req, res) {
  const report = _.toLower(req.body.queryClusterAZ);
  const filter = _.toLower(req.body.inputForm);
  const result = [];

  const csvWriter = createCsvWriter({
    path: 'report.csv',
    header: [
      {id: 'cluster', title: 'Cluster'},
      {id: 'az', title: 'AZ'},
      {id: '_circuit', title: 'Cross-Connect ID'},
      {id: 'serviceprovider', title: 'Service Provider / Peer'},
      {id: 'bandwidth', title: 'Bandwidth (Gbps)'},
      {id: 'device', title: 'Device'},
      {id: 'interface', title: 'Interface'},
      {id: 'patchpanel', title: 'Patch-Panel'},
      {id: 'patchpanelport', title: 'Patch-Panel Port'},
      {id: 'rack', title: 'Rack'},
      {id: 'ticket', title: "Ticket Number"}
    ]
  });

  fs.truncate(__dirname + '/report.csv', 0, function(){});

  if (report === "cluster") {

    Cluster.countDocuments({_id: filter}, function(err, foundCluster){
      if (foundCluster === 0) {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is not registered",
          route: "/report"
        });
      } else if (foundCluster === 1) {
        Xconn.countDocuments({cluster: filter}, function(err, foundCircuits){
          if(foundCircuits === 0){
            res.render("fail.ejs", {
              fail: _.toUpper(filter) + " doesn't have cross-connect circuits registered",
              route: "/report"
            });
          } else {

            const sort = {az: 1}; // 1 = increase.

            Xconn.find({cluster: filter}, function(err, docs) {

              // Generates the file the redirects to downloadSearch, which is a get method to download the file.
              csvWriter.writeRecords(docs);
              res.redirect("/downloadSearch");

            }).sort(sort); // Sorts the database values by alphabetic order.
          }
        });
      } else {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is duplicated",
          route: "/report"
        });
      }
    });

  } else {

    Az.countDocuments({_id: filter}, function(err, foundAz){
      if (foundAz === 0) {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is not registered",
          route: "/report"
        });
      } else if (foundAz === 1) {
        Xconn.countDocuments({az: filter}, function(err, foundCircuits){
          if (foundCircuits === 0) {
            res.render("fail.ejs", {
              fail: _.toUpper(filter) + " doesn't have cross-connect circuits registered",
              route: "/report"
            });
          } else {
            Xconn.find({az: filter}, function(err, docs){

              csvWriter.writeRecords(docs);
              res.redirect("/downloadSearch");

            });
          }
        });
      } else {
        res.render("fail.ejs", {
          fail: _.toUpper(filter) + " is duplicated",
          route: "/report"
        });
      }
    });
  }
});

let i = 0;
function firstInputDatabase(results){

  results.forEach(function(data){
    Az.countDocuments({_id: data.az}, function(err, foundAz) {
      if (foundAz === 1) {
        console.log("1");
        PatchPanel.countDocuments({_patchpanel: data.patchPanel, az: data.az}, function(err, foundPatchPanel) {
          if (foundPatchPanel === 1) {
            console.log("2");
            PatchPanel.findOne({_patchpanel: data.patchPanel, az: data.az}, function(err, pp) {
              // const rack = pp.rack;
              if (pp.capacity > 0) {
                console.log("3");
                Xconn.countDocuments({_circuit: data._circuit, az: data.az}, function(err, doc) {
                  if (doc === 0) {
                    console.log("4");
                    const newCircuit = new Xconn({
                      _circuit: data._circuit,
                      serviceprovider: data.serviceProvider,
                      bandwidth: data.bandwidth,
                      // rack: rack,
                      patchpanel: data.patchPanel,
                      patchpanelport: data.patchPanelPort,
                      device: data.device,
                      interface: data.interface,
                      az: data.az,
                      cluster: data.cluster
                    });
                    // newCircuit.save();
                    i++;
                    console.log("Circuit " + i + ": " + newCircuit);

                    PatchPanel.findOneAndUpdate({az: data.az, _patchpanel: data.patchPanel}, {$inc: {capacity: -1}}, function(err, ppupdate) {});
                  }
                });
              }
            });
          }
        });
      }
    });
  });
}


app.post("/upload", function(req, res){
    const form = new formidable.IncomingForm();
    //https://shiya.io/simple-file-upload-with-express-js-and-formidable-in-node-js/
    const oldPatchPanel = "";
    const ticket = "";
    const actionAddUpdate = "addcircuit";
    const results = [];
    const azs = [];
    let uniqueAzs = [];
    const patchpanels = [];
    let uniquePatchPanels = [];
    const patchpanelsDB = [];
    const patchpanelCount = {};
    const patchpanelsRack = {};


    form.parse(req);

    form.on("fileBegin", function(name, file){
      file.path = __dirname + '/uploads/' + file.name;
    });

    form.on('file', function (name, file){
      file[name] = "template.csv";
      // console.log(file.name);

        fs.createReadStream(__dirname + "/uploads/" + file.name)
          .pipe(csv())
          .on("data", (data) => {

            results.push(data);

            // console.log(results);


            // console.log(data.az + data.patchpanel);



            // fs.unlink(file.name);
            // Az.countDocuments({_id: data.az}, function(err, foundAz) {
            //   if (foundAz === 1) {
            //     PatchPanel.countDocuments({_patchpanel: data.patchPanel, az: data.az}, function(err, foundPatchPanel) {
            //       if (foundPatchPanel === 1) {
            //         PatchPanel.findOne({_patchpanel: data.patchPanel, az: data.az}, function(err, pp) {
            //           const rack = pp.rack;
            //           if (pp.capacity > 0) {
            //             Xconn.countDocuments({_circuit: data._circuit, az: data.az}, function(err, doc) {
            //               if (doc === 0) {
            //                 const newCircuit = new Xconn({
            //                   _circuit: data._circuit,
            //                   serviceprovider: data.serviceProvider,
            //                   bandwidth: data.bandwidth,
            //                   rack: rack,
            //                   patchpanel: data.patchPanel,
            //                   patchpanelport: data.patchPanelPort,
            //                   device: data.device,
            //                   interface: data.interface,
            //                   az: data.az,
            //                   cluster: data.cluster
            //                 });
            //                 newCircuit.save();
            //
            //                 PatchPanel.findOneAndUpdate({az: data.az, _patchpanel: data.patchPanel}, {$inc: {capacity: -1}}, function(err, ppupdate) {});
            //               }
            //             });
            //           }
            //         });
            //       }
            //     });
            //   }
            // });
          })
          .on("end", () => {
            // console.log(results);
            // firstInputDatabase(results);

            let resultsString = JSON.stringify(results);
            let resultsLower = _.toLower(resultsString);
            let resultsObj = JSON.parse(resultsLower);
            let rackPosition = {};
            let ppRack;



            resultsObj.forEach(arrayFile => {
              azs.push(arrayFile.az);
              patchpanels.push(arrayFile.patchpanel);
              PatchPanel.findOne({az: arrayFile.az, _patchpanel: arrayFile.patchpanel}, (err, doc) => {
                // console.log(doc.rack);
                rackPosition[arrayFile.patchpanel] = doc.rack;
              });
            });





            // https://wsvincent.com/javascript-remove-duplicates-array/
            uniqueAzs = [...new Set(azs)];
            uniquePatchPanels = [...new Set(patchpanels)];



            uniquePatchPanels.forEach((panel) => {
              let count = 0;
              for (var i = 0; i < patchpanels.length; i++) {
                if (panel === patchpanels[i]) {
                  count++;
                }
              }
              patchpanelCount[panel] = count;
              // console.log(patchpanelCount);
            });






            // console.log(uniqueAzs.length + uniqueAzs[0]);
            if (uniqueAzs.length === 1) {
              Xconn.countDocuments({az: uniqueAzs[0]}, function(err, foundXconn){
                if (!foundXconn) {
                  // console.log(uniqueAzs[0]);
                  Az.countDocuments({_id: uniqueAzs[0]}, function(err, foundAz){
                    // console.log(foundAz);
                    if (foundAz) {

                      PatchPanel.find({az: uniqueAzs[0]}, function(err, foundPP){
                        foundPP.forEach((pps) => {
                          // console.log(pps._patchpanel);
                          patchpanelsDB.push(pps._patchpanel);
                          patchpanelsRack[pps._patchpanel] = pps.rack;
                        });

                        if (uniquePatchPanels.length !== patchpanelsDB.length) {
                          res.render("fail.ejs", {
                            fail: "Patch-Panels must be registered prior to uploading the CSV file",
                            route: "/add"
                          });
                        } else if (_.toLower(uniquePatchPanels.sort()) !== _.toLower(patchpanelsDB.sort())) {
                          res.render("fail.ejs", {
                            fail: "All Patch-Panels from the CSV file must match the ones registered on the database",
                            route: "/add"
                          });
                        } else {
                          // let resultsString = JSON.stringify(results);
                          // let resultsLower = _.toLower(resultsString);
                          // let resultsObj = JSON.parse(resultsLower);

                          // console.log(foundPP);

                          const circuitArray = [];

                          resultsObj.forEach((element) => {
                            circuitArray.push(element._circuit);
                          });
                          let uniqueCircuitArray = [...new Set(circuitArray)];

                          // console.log(circuitArray);
                          // console.log(uniqueCircuitArray);

                          if (uniqueCircuitArray.length === circuitArray.length) {
                            // console.log("match");

                            Xconn.insertMany(resultsObj, function(err, docs){
                              // docs.forEach((panel) => {
                              //   console.log(panel.patchpanel);
                              //   PatchPanel.findOne({az: uniqueAzs[0], _patchpanel: panel.patchpanel}, (err, foundPP) => {
                              //     console.log(foundPP._patchpanel);
                              //
                              //     // foundPP.forEach((pp) => {
                              //     //   Xconn.updateMany({az: uniqueAzs[0], patchpanel: pp.patchpanel}, {rack: pp.rack}, () => {
                              //     //     // console.log(pp.rack);
                              //     //   });
                              //     //
                              //     // });
                              //     // Xconn.updateOne({az: uniqueAzs[0], patchpanel: panel}, {rack: foundPP.rack});
                              //   });
                              // });

                              uniquePatchPanels.forEach((panel) => {
                                let amountOfXconns = patchpanelCount[panel];
                                ppRack = rackPosition[panel];
                                console.log(ppRack);

                                Xconn.updateMany({az: uniqueAzs[0], patchpanel: panel}, {rack: ppRack}, (err, docs) => {
                                  console.log("rack: " + docs.rack);
                                  console.log(docs.n, docs.nModified);
                                });

                                // console.log(amountOfXconns);
                                PatchPanel.updateOne({az: uniqueAzs[0], _patchpanel: panel}, {$inc: {capacity: -amountOfXconns}}, () => {
                                  // console.log("Patch-panel " + panel + " updated");
                                  // Xconn.updateOne({az: uniqueAzs[0], patchpanel: panel}, {rack: });
                                  // Xconn.updateOne({az: uniqueAzs[0], patchpanel: panel}, )

                                });

                                // Xconn.updateMany({az: uniqueAzs[0], patchpanel: panel}, {rack: ppRack}, (err, docs) => {
                                //   console.log("rack: " + docs.rack);
                                //   console.log(docs.n, docs.nModified);
                                // });
                                // console.log(rackPosition[panel]);


                              });





                              res.render("success.ejs", {
                                success: "Records updated for " + _.toUpper(uniqueAzs[0]),
                                route: "/"
                              });
                            });






                          } else {
                            // console.log("do not match");
                            res.render("fail.ejs", {
                              fail: "There are duplicated IDs in the CSV file. Fix that prior to uploading the file",
                              route: "/"
                            });
                          }

                          // console.log(elementArray);




                          // uniquePatchPanels.forEach((panel) => {
                          //   let amountOfXconns = patchpanelCount[panel];
                          //   // console.log(amountOfXconns);
                          //   PatchPanel.updateOne({_patchpanel: panel}, {$inc: {capacity: -amountOfXconns}}, () => {
                          //     console.log("Patch-panel " + panel + " updated");
                          //   });
                          // });
                          // console.log(foundPP);


                          // Xconn.insertMany(resultsObj, function(err, docs){
                          //   res.render("success.ejs", {
                          //     success: "Records updated for " + _.toUpper(uniqueAzs[0]),
                          //     route: "/"
                          //   });
                          // });
                        }
                      });

                    } else {
                      res.render("fail.ejs", {
                        fail: "No AZ record found for " + uniqueAzs[0],
                        route: "/add"
                      });
                    }
                  });


                } else {
                  res.render("fail.ejs", {
                    fail: _.toUpper(uniqueAzs[0]) + " already contains Cross-Connections registered. Please add new connections individually",
                    route: "/add"
                  });
                }
              });
            } else {
              res.render("fail.ejs", {
                fail: "Please upload one CSV file per AZ",
                route: "/upload-cv"
              });
            }

            // Xconn.countDocuments({az: az[0]}, function(err, foundXconn){
            //   if (!foundXconn) {
            //     Xconn.insertMany(results, function(err, docs){
            //       console.log(docs);
            //       res.render("success.ejs", {
            //         success: "Cross-Connect records uploaded sucessfully",
            //         route: "/"
            //       });
            //     });
            //   } else {
            //     res.render("fail.ejs", {
            //       fail: _.toUpper(az[0]) + " contains Cross-Connects registered. Please either decommission all connections for your AZ or upload the new circuits one by one",
            //       route: "/"
            //     });
            //   }
            // });

            fs.unlink(__dirname + "/uploads/" + file.name, (err) => {
              if (err) {
                console.error(err)
                return
              }
            });

          });
    });
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
  res.render("del.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/deletexconn", function(req, res) {
  res.render("delete.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/deletepp", function(req, res){
  res.render("deletepp.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/report", function(req, res) {
  res.render("report.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});

app.get("/downloadSearch", function(req, res){
  res.setHeader('Content-disposition', 'attachment; filename=report.csv');
  res.setHeader('content-type', 'text/csv');
  res.download(__dirname + '/report.csv');
});

app.get("/downloadTemplate", function(req, res){
  console.log("Download template");
  res.setHeader('Content-disposition', 'attachment; filename=cross-connect-template.csv');
  res.setHeader('content-type', 'text/csv');
  res.download(__dirname + '/downloads/cross-connect-template.csv');
});

app.get("/upload-csv", function(req, res){
  res.render("upload.ejs", {
    skyrimPhrases: skyrimPhrases[randomSkyrimPhrase(skyrimPhrases.length)]
  });
});




app.listen(3000, function() {
  console.log("Server running on port 3000");
});
