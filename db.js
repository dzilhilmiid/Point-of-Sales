const { Pool } = require("pg");

const db = new Pool({
    user: "postgres",
    host: "localhost",
    database: "posdb",
    password: "hilmi12",
    port: 5432
});

db.connect()
    .then(() => console.log("PostgreSQL Connected"))
    .catch(err => console.log(err));

module.exports = db;
