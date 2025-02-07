var express = require("express");
const cors = require("cors");
var bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require('path');
dotenv.config();
const config = require("./config/config")
var route = require("./routes/route");

var app = express();
app.use(cors({origin: '*'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', route);
app.set("port", config.port);
app.listen(app.get("port"), () =>
console.log(`App started on port ${app.get("port")}`)
);