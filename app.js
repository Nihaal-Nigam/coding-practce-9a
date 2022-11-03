const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server instance running");
    });
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};
initializeDBandServer();

//register user
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const encryptedPassword = bcrypt.hash(password, 10);
  const checkForUserQuery = `
  select * from user where username = '${username}'
  `;
  const checkForUser = await db.get(checkForUserQuery);
  console.log(checkForUser);
  if (checkForUser === undefined) {
    //we will move further to register user
    const checkForPasswordLength = password.length;
    if (checkForPasswordLength < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      registerUserQuery = `
        insert into user (username, name, password, gender, location)
        values ('${username}', 
                '${name}', 
                '${encryptedPassword}', 
                '${gender}',
                '${location}'
                );
        `;
      const registerUser = await db.run(registerUserQuery);
      response.send("User created successfully");
    }
  } else {
    //username already registered
    response.status(400);
    response.send("User already exists");
  }
});

//login user
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//change password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkForUserQuery = `
    select * from user where username = '${username}'
    `;
  const dbUser = await db.get(checkForUserQuery);
  if (dbUser === undefined) {
    //user not registered
    response.status(400);
    response.send("User not registered");
  } else {
    //check for password
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      //check length of new password
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword < 5) {
        //password is too short
        response.status(400);
        response.send("Password is too short");
      } else {
        //update password
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
        update user
        set 
            password= '${encryptedPassword}'
        where username = '${username}'
        `;
        await db.run(updatePasswordQuery);

        response.send("Password updated");
      }
    } else {
      //invalid password
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
