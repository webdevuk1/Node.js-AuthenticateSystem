// Creating the server with express.
require("./config/db");

const app = require("express")();
const port = process.env.PORT || 5000;

const UserRouter = require("./api/User");

// body-parser extracts the entire body portion of an incoming request stream and exposes it on req.body. This will run EVERY TIME a request is sent.
const bodyParser = require("express").json;
app.use(bodyParser());

// This middleware will be fired once a user sends a request and the HTTP matches the middleware route, This will trigger and the logic inside UserRouter will respone with a function for the user.
app.use("/user", UserRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

/* 
Middleware makes it easier for software developers to implement communication and input/output, so they can focus on the specific purpose of their application.

use()
Express apps have a use() function. This function adds a new middleware to the app, app.use(middleware) is called every time a request is sent to the server.
.use url: https://stackoverflow.com/questions/11321635/nodejs-express-what-is-app-use

What is Express bodyParser?
Express body-parser is an npm library used to process data sent through an HTTP request body. It exposes four express middlewares for parsing text, JSON, url-encoded and raw data set through an HTTP request body. These middlewares are functions that process incoming requests before they reach the target controller.
*/
