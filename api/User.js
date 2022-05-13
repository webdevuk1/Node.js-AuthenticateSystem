// Instead of having all of the logic inside server.js we have split the get, post, delete within the api file. This Will Insure Clean And Tidy Code.

// Express Router Tutorial https://www.youtube.com/watch?v=vfkOaiDeBAA
// Nodejs login system backend https://www.youtube.com/watch?v=5yU-P0grJjk&list=PLk8gdrb2DmChrL50moKeFNAVnFqZ3GLF7&index=1
// Regex Tutorial (Regular Expression) https://www.youtube.com/watch?v=r6I-Ahc0HB4&list=PL4cUxeGkcC9g6m_6Sld9Q4jzqdqHd2HiD&index=1
// What is Password Hashing and Salting? https://www.okta.com/uk/blog/2019/03/what-are-salted-passwords-and-password-hashing/

const express = require("express");
// Routing refers to determining how an application responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on). Each route can have one or more handler functions, which are executed when the route is matched.
const router = express.Router();

// Mongodb modals
const User = require("./../models/User");
const UserVerification = require("./../models/UserVerification");

// Email handler:
// Even though Gmail is the fastest way to get started with sending
// emails, it is by no means a preferable
// solution unless you are using OAuth2 authentication.
// Look at nodemailer for alternatives options.
const nodemailer = require("nodemailer");

// Unique string
const { v4: uuidv4 } = require("uuid");

// Password handler: Bcrypt is a popular and trusted method for salt and hashing passwords before storing it in a database.
const bcrypt = require("bcrypt");

// Path for static verified page.
const path = require("path");

// Env
require("dotenv").config();

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

// Testing success of nodemailer
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready for messages");
    console.log(success);
  }
});

// Signup
router.post("/signup", (req, res) => {
  let { name, email, password, dateOfBirth } = req.body;
  name = name.trim();
  email = email.trim();
  password = password.trim();
  dateOfBirth = dateOfBirth.trim();

  if (name == "" || email == "" || password == "" || dateOfBirth == "") {
    res.json({
      status: "FAILED",
      message: "Empty input fields!",
    });
  } else if (!/^[a-zA-Z ]*$/.test(name)) {
    res.json({
      status: "FAILED",
      message: "Invalid name entered",
    });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    res.json({
      status: "FAILED",
      message: "Invalid email entered",
    });
  } else if (!new Date(dateOfBirth).getTime()) {
    res.json({
      status: "FAILED",
      message: "Invalid date of birth entered",
    });
  } else if (password.lengh < 8) {
    res.json({
      status: "FAILED",
      message: "Password is too short!",
    });
  } else {
    // Preventing Duplicate Users (User already exists)
    User.find({ email })
      .then((result) => {
        if (result.length) {
          console.log(result);
          // A user already exists
          res.json({
            status: "FAILED",
            message: "User with the provided email already exists",
          });
        } else {
          // Try to create new user

          //  Password handling
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashedPassword) => {
              const newUser = new User({
                name,
                email,
                password: hashedPassword,
                dateOfBirth,
                verified: false,
              });

              newUser
                .save()
                .then((result) => {
                  // res.json({
                  //   status: "SUCCESS",
                  //   message: "Signup successful",
                  //   data: result,
                  // });
                  // Handle account verification
                  sendVerificationEmail(result, res);
                })
                .catch((err) => {
                  res.json({
                    status: "FAILED",
                    message: "An error occurred while saving user account!",
                  });
                });
            })
            .catch((err) => {
              res.json({
                status: "FAILED",
                message: "An error occurred while hashing password!",
              });
            });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: "FAILED",
          message: "An error occurred while checking for existing user!",
        });
      });
  }
});

// Send verification email
const sendVerificationEmail = ({ _id, email }, res) => {
  // Url to be used in the email: Currently set as local host.
  const currentUrl = "http://localhost:5000/";

  const uniqueString = uuidv4() + _id;

  // Mail options
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Verify your email address to complete the signup and login into your account.</p><p>This link <b>expires in 6 hours</b>.</p><p>Press <a href=${
      currentUrl + "user/verify/" + _id + "/" + uniqueString
    }>here</a> to proceed.</p>`,
  };

  // Hash the uniqueString
  const saltRounds = 10;
  bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) => {
      // Set values in userVeriification collection MongoDB
      const newVerification = new UserVerification({
        userId: _id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 21600000,
      });

      newVerification
        .save()
        .then(() => {
          transporter
            .sendMail(mailOptions)
            .then(() => {
              // Email sent and verification record saved
              res.json({
                status: "PENDING",
                message: "Verification email sent",
              });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Verification email failed",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.json({
            status: "FAILED",
            message: "Couldn't save verification email data!",
          });
        });
    })
    .catch(() => {
      res.json({
        status: "FAILED",
        message: "An error occurred while hashing email data!",
      });
    });
};

// Verify email
router.get("/verify/:userId/:uniqueString", (req, res) => {
  let { userId, uniqueString } = req.params;

  UserVerification.find({ userId })
    .then((result) => {
      if (result.length > 0) {
        // User verification record exists so we proceed.

        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;

        // Checking for expired unique string.
        if (expiresAt < Date.now()) {
          // Record has expired so we delete it.
          UserVerification.deleteOne({ userId })
            .then((result) => {
              User.deleteOne({ _id: userId })
                .then(() => {
                  let message = "Link has expired. Please sign up again";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                })
                .catch((error) => {
                  let message =
                    "Clearing user with expired unique string failed.";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                });
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occurred while clearing expired user verification record.";

              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        } else {
          // Valid record exists so we validate the user string.
          // First compare the hashed unique string.
          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                // Strings match: Updated the user record (verified: true)
                // Then removed (verified: true) from the modal once signed in. Not sure why we delete userId need look into it. and does it delete the whole modal const or just the const UserVerificationSchema = new Schema({userId: String})
                User.updateOne({ _id: userId }, { verified: true })
                  .then(() => {
                    UserVerification.deleteOne({ userId })
                      .then(() => {
                        // Successful verification
                        res.sendFile(
                          path.join(__dirname, "./../views/verified.html")
                        );
                      })
                      .catch((error) => {
                        console.log(error);
                        let message =
                          "An error occurred while finalizing successful verification.";
                        res.redirect(
                          `/user/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    let message =
                      "An error occurred while updating user record to show verified.";
                    res.redirect(
                      `/user/verified/error=true&message=${message}`
                    );
                  });
              } else {
                // existing record but incrrect verification details passed.
                let message =
                  "Invalid verification details passed. Check your inbox.";
                res.redirect(`/user/verified/error=true&message=${message}`);
              }
            })
            .catch((error) => {
              let message =
                "An error occurred while comparing uniqueStrings & hashedUniqueString";
              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        }
      } else {
        // User verification record doesn't exist.
        // Redirect to the route and attach the message stored.
        let message =
          "Account record doesn't exist or has been verified already. Please sign up or log in.";

        res.redirect(`/user/verified/error=true&message=${message}`);
      }
    })
    .catch((error) => {
      // Redirect to the route and attach the message stored.
      console.log(error);
      let message =
        "An error occurred while checking for existing use verification record.";

      res.redirect(`/user/verified/error=true&message=${message}`);
    });
});

// Verified page route. might not need this delete and check if sign up still works if not keep it ________________________
router.get("/verified", (req, res) => {
  // Returning the static html file (Verified.html) to the user.
  res.sendFile(path.join(__dirname, "./../views/Verified.html"));
  // Note: __dirname returns the directory that the currently executing script is in. In your case, it looks like server.js is in app/. So, to get to public, you'll need back out one level first: ../public/index1.html.
  // Note: path is a built-in module that needs to be required for the above code to work: var path = require('path');
  // Node.js path: https://nodejs.org/api/path.html#pathjoinpaths
});

// Signin
router.post("/signin", (req, res) => {
  let { email, password } = req.body;

  email = email.trim();
  password = password.trim();

  if (email == "" || password == "") {
    res.json({
      status: "FAILED",
      message: "Empty credentials supplied",
    });
  } else {
    // Check if user exists
    User.find({ email })
      .then((data) => {
        if (data.length) {
          // User  ----

          // Check if the user if verified.
          // If false
          if (!data[0].verified) {
            res.json({
              status: "FAILED",
              message: "Email hasn't been verified. Check your inbox.",
            });
          } else {
            console.log(data);
            const hashedPassword = data[0].password;
            bcrypt
              .compare(password, hashedPassword)
              .then((result) => {
                if (result) {
                  // Password matched
                  res.json({
                    status: "SUCCESS",
                    message: "Signin successful",
                    data: data,
                  });
                } else {
                  res.json({
                    status: "FAILED",
                    message: "Invalid password entered!",
                  });
                }
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message: "An error occurred while comparing passwords",
                });
              });
          }
        } else {
          res.json({
            status: "FAILED",
            message: "Invald credentials entered!",
          });
        }
      })
      .catch((err) => {
        res.json({
          status: "FAILED",
          message: "An error occurred while checking for existing user",
        });
      });
  }
});

module.exports = router;
