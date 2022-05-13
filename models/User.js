// Creating the mongoose schema
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: String,
  email: String,
  password: String,
  dateOfBirth: Date,
  verified: Boolean,
});

// NEED CHECK IF TRUE: Creates a collection called user and stores the schema.
const User = mongoose.model("User", UserSchema);

module.exports = User;
