const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();

// ================= SETUP =================
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "pos_secret",
    resave: false,
    saveUninitialized: true
}));

// ================= AUTH =================
function auth(req, res, next) {
    if (req.session.isLogin) {
        next();
    } else {
        res.redirect("/login");
    }
}

// ================= ROOT =================
app.get("/", (req, res) => {
    if (req.session.isLogin) {
        res.redirect("/dashboard");
    } else {
        res.redirect("/login");
    }
});

// ================= LOGIN =================
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email=? AND password=?",
        [email, password],
        (err, result) => {
            if (err) throw err;

            if (result.length > 0) {
                req.session.isLogin = true;
                req.session.user = result[0]; // ✅ SIMPAN USER
                res.redirect("/dashboard");
            } else {
                res.send("Login gagal");
            }
        }
    );
});

// ================= DASHBOARD =================
app.get("/dashboard", auth, (req, res) => {
    res.render("dashboard", {
        name: req.session.user.name // ✅ KIRIM KE EJS
    });
});

// ================= MEMBERS =================

// LIST + SEARCH + PAGINATION
app.get("/members", auth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    const countSql = `
        SELECT COUNT(*) AS total
        FROM members
        WHERE name LIKE ?
    `;

    db.query(countSql, [`%${search}%`], (err, countResult) => {
        if (err) throw err;

        const totalData = countResult[0].total;
        const totalPage = Math.ceil(totalData / limit);

        const dataSql = `
            SELECT * FROM members
            WHERE name LIKE ?
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `;

        db.query(
            dataSql,
            [`%${search}%`, limit, offset],
            (err, members) => {
                if (err) throw err;

                res.render("members/index", {
                    members,
                    page,
                    totalPage,
                    limit,
                    search
                });
            }
        );
    });
});

// ================= ADD MEMBER =================
app.get("/members/add", auth, (req, res) => {
    res.render("members/add");
});

app.post("/members/add", auth, (req, res) => {
    const { name, phone, address } = req.body;

    db.query(
        "INSERT INTO members (name, phone, address) VALUES (?,?,?)",
        [name, phone, address],
        () => res.redirect("/members")
    );
});

// ================= EDIT MEMBER =================
app.get("/members/edit/:id", auth, (req, res) => {
    db.query(
        "SELECT * FROM members WHERE id=?",
        [req.params.id],
        (err, result) => {
            if (err) throw err;

            // 🔴 TAMBAHKAN INI
            if (result.length === 0) {
                return res.send("Data member tidak ditemukan");
            }

            res.render("members/edit", { member: result[0] });
        }
    );
});

app.post("/members/edit/:id", auth, (req, res) => {
    console.log("ROUTE EDIT KEHIT");
    const { name, phone, email } = req.body;

db.query(
    "UPDATE members SET name=?, phone=?, email=? WHERE id=?",
    [name, phone, email, req.params.id],
        () => res.redirect("/members")
    );
});

// ================= DELETE MEMBER =================
app.get("/members/delete/:id", auth, (req, res) => {
    db.query(
        "DELETE FROM members WHERE id=?",
        [req.params.id],
        () => res.redirect("/members")
    );
});

// ================= UNITS =================
app.get("/units", auth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    const sort = req.query.sort || "id";
    const order = req.query.order || "DESC";
    const offset = (page - 1) * limit;

    const countSql = `
        SELECT COUNT(*) AS total
        FROM units
        WHERE unit LIKE ? OR note LIKE ?
    `;

    db.query(countSql, [`%${search}%`, `%${search}%`], (err, countResult) => {
        if (err) throw err;

        const totalData = countResult[0].total;
        const totalPage = Math.ceil(totalData / limit);

        const dataSql = `
            SELECT * FROM units
            WHERE unit LIKE ? OR note LIKE ?
            ORDER BY ${sort} ${order}
            LIMIT ? OFFSET ?
        `;

        db.query(
            dataSql,
            [`%${search}%`, `%${search}%`, limit, offset],
            (err, units) => {
                if (err) throw err;

                res.render("units/index", {
                    units,
                    page,
                    totalPage,
                    limit,
                    search,
                    sort,
                    order
                });
            }
        );
    });
});

// ================= ADD UNITS =================
app.get("/units/add", auth, (req, res) => {
    res.render("units/add");
});

app.post("/units/add", auth, (req, res) => {
    const { unit, note } = req.body;

    if (!unit) {
        return res.send("Unit wajib diisi");
    }

    db.query(
        "INSERT INTO units (unit, note) VALUES (?,?)",
        [unit, note],
        () => res.redirect("/units")
    );
});

// ================= EDIT UNITS =================
app.get("/units/edit/:id", auth, (req, res) => {
    db.query(
        "SELECT * FROM units WHERE id=?",
        [req.params.id],
        (err, result) => {
            if (err) throw err;

            if (result.length === 0) {
                return res.send("Data unit tidak ditemukan");
            }

            res.render("units/edit", { unit: result[0] });
        }
    );
});

app.post("/units/edit/:id", auth, (req, res) => {
    const { unit, note } = req.body;

    db.query(
        "UPDATE units SET unit=?, note=? WHERE id=?",
        [unit, note, req.params.id],
        () => res.redirect("/units")
    );
});

// ================= DELETE UNITS =================
app.get("/units/delete/:id", auth, (req, res) => {
    db.query(
        "DELETE FROM units WHERE id=?",
        [req.params.id],
        () => res.redirect("/units")
    );
});

// ================= USERS =================
app.get("/users", auth, (req, res) => {
    res.render("users", {
        user: req.session.user
    });
});

// ================= LOGOUT =================
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// ================= SERVER =================
app.listen(3000, () => {
    console.log("Server running http://localhost:3000");
});
