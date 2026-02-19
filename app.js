const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./db");
const expressLayouts = require("express-ejs-layouts");

const app = express();

/* ====================== SETTING DASAR ====================== */

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ====================== SESSION ====================== */

app.use(session({
  secret: "secretpos",
  resave: false,
  saveUninitialized: true
}));

/* ====================== GLOBAL USER KE EJS ======================
   supaya layout.ejs bisa akses user login
*/
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

/* ====================== LAYOUT EJS ====================== */

app.use(expressLayouts);
app.set("layout", "layout");

/* ====================== ROUTES ====================== */

// ================= LOGIN PAGE =================
app.get("/", (req, res) => {
  res.render("login", { layout: false });
});

// ================= PROSES LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      const match = await bcrypt.compare(password, user.password);

      if (match) {
        req.session.user = user;
        return res.redirect("/dashboard");
      }
    }

    res.send("Login gagal");
  } catch (err) {
    console.log(err);
    res.send("Terjadi kesalahan server");
  }
});

// ================= DASHBOARD =================
app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }

  res.render("dashboard");
});

// ================= MEMBERS CRUD =================
const membersRoute = require("./routes/members");
app.use("/members", membersRoute);

// ================= UNITS CRUD =================
const unitsRouter = require('./routes/units');
app.use('/units', unitsRouter);

// ================= GOODS CRUD =================
const goodsRoutes = require("./routes/goods");
app.use("/goods", goodsRoutes);

// ================= SUPPLIERS CRUD =================
const suppliersRoutes = require("./routes/suppliers");
app.use("/suppliers", suppliersRoutes);

// ================= PURCHASES CRUD =================
const purchasesRoutes = require("./routes/purchases");
app.use("/purchases", purchasesRoutes);

// ================= LOGOUT =================
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/* ====================== SERVER ====================== */

app.listen(3000, () => {
  console.log("Server jalan di http://localhost:3000");
});