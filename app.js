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



// Creating Model, which is the constructor method.
const Xconn = mongoose.model("Connection", circuitSchema);

// const circuit = new Xconn({
//   _id: 123456,
//   serviceprovider: "telefonica",
//   bandwidth: 10,
//   rack: "R9000",
//   patchpanel: "LIU 15",
//   port: "1/2",
//   device: "gru1-br-cor-r3",
//   interface: "et-0/0/1",
//   az: "gru1",
//   cluster: "gru"
// });
//
// const circuit2 = new Xconn({
//   _id: 654321,
//   serviceprovider: "embratel",
//   bandwidth: 100,
//   rack: "R9000",
//   patchpanel: "LIU 15",
//   port: "3/4",
//   device: "gru2-br-cor-r4",
//   interface: "et-0/0/49",
//   az: "gru2",
//   cluster: "gru"
// });
//
// const circuit3 = new Xconn({
//   _id: 987654,
//   serviceprovider: "google",
//   bandwidth: 100,
//   rack: "R9000",
//   patchpanel: "LIU 15",
//   port: "3/4",
//   device: "gru3-br-cor-r2",
//   interface: "et-0/0/11",
//   az: "gru3",
//   cluster: "gru"
// });
//
// const circuit4 = new Xconn({
//   _id: 456789,
//   serviceprovider: "microsoft",
//   bandwidth: 100,
//   rack: "R9000",
//   patchpanel: "LIU 15",
//   port: "3/4",
//   device: "gru4-br-cor-r1",
//   interface: "xe-0/0/10",
//   az: "gru4",
//   cluster: "gru"
// });


// circuit.save();
// circuit2.save();
// circuit3.save();
// circuit4.save();

// This action is triggered when a request is received at the home route.
app.get("/", function(req, res){
  res.render("index.ejs");
});


app.get("/search", function(req, res){
  res.render("search.ejs");
});

app.get("/add", function(req, res){
  res.render("add.ejs");
});

app.get("/update", function(req, res){
  res.render("update.ejs");
});


// Search results.
app.post("/result", function(req, res){
  const typeOfData = _.toLower(req.body.query);
  const valueOfData = _.toLower(req.body.inputForm);
  const query = {};
  query[typeOfData] = valueOfData.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  console.log(query);

  Xconn.find(query, function(err, connection){
    res.render("result.ejs", {
      connection: connection,
      valueOfData: valueOfData
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
  const az = _.toLower(req.body.az);

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

  circuit.save();

});


// Opening the server for connections.
app.listen(3000, function(){
  console.log("Server running on port 3000");
});
