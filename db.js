const mysql = require("mysql");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "posdb"
});

db.connect((err) => {
    if (err) {
        console.log("DB ERROR:", err);
        return;
    }
    console.log("MySQL Connected");
});

module.exports = db;