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

  res.redirect("/add");

});


// Opening the server for connections.
app.listen(3000, function(){
  console.log("Server running on port 3000");
});
