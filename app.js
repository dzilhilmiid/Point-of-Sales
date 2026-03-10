const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./db");
const expressLayouts = require("express-ejs-layouts");

const app = express();

/* ====================== BASIC SETUP ====================== */

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* ====================== SESSION ====================== */

app.use(session({
  secret: "secretpos",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 // 1 jam
  }
}));

/* ====================== GLOBAL USER ====================== */

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

/* ====================== LAYOUT ====================== */

app.use(expressLayouts);
app.set("layout", "layout");

/* ====================== AUTH ====================== */

function checkAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}

/* ====================== LOGIN ====================== */

app.get("/", (req, res) => {
  res.render("login", { layout: false });
});

app.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    const result = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.send("User tidak ditemukan");
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.send("Password salah");
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.send("Terjadi kesalahan server");
  }

});

/* ====================== DASHBOARD ====================== */

app.get("/dashboard", checkAuth, async (req, res) => {

  try {

    const [
      revenue,
      orders,
      members,
      goods,
      suppliers,
      customers,
      purchases,
      todayRevenue,
      chartData,
      recentSales
    ] = await Promise.all([

      // TOTAL REVENUE
      db.query(`
        SELECT COALESCE(SUM(d.subtotal),0) AS total
        FROM sales s
        JOIN sales_detail d ON d.sale_id = s.id
      `),

      db.query("SELECT COUNT(*) FROM sales"),
      db.query("SELECT COUNT(*) FROM members"),
      db.query("SELECT COUNT(*) FROM goods"),
      db.query("SELECT COUNT(*) FROM suppliers"),
      db.query("SELECT COUNT(*) FROM customers"),
      db.query("SELECT COUNT(*) FROM purchases"),

      // TODAY REVENUE
      db.query(`
        SELECT COALESCE(SUM(d.subtotal),0) AS total
        FROM sales s
        JOIN sales_detail d ON d.sale_id = s.id
        WHERE DATE(s.created_at) = CURRENT_DATE
      `),

      // SALES CHART
      db.query(`
        SELECT 
        DATE(s.created_at) AS date,
        SUM(d.subtotal) AS total
        FROM sales s
        JOIN sales_detail d ON d.sale_id = s.id
        GROUP BY DATE(s.created_at)
        ORDER BY DATE(s.created_at)
      `),

      // RECENT TRANSACTIONS
      db.query(`
        SELECT 
        s.invoice_number,
        s.created_at,
        SUM(d.subtotal) AS total
        FROM sales s
        JOIN sales_detail d ON d.sale_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 5
      `)

    ]);

    res.render("dashboard", {

      totalSales: Number(revenue.rows[0].total),
      totalOrders: Number(orders.rows[0].count),
      totalMembers: Number(members.rows[0].count),
      totalGoods: Number(goods.rows[0].count),
      totalSuppliers: Number(suppliers.rows[0].count),
      totalCustomers: Number(customers.rows[0].count),
      totalPurchases: Number(purchases.rows[0].count),
      today: Number(todayRevenue.rows[0].total),

      chartLabels: chartData.rows.map(r =>
        new Date(r.date).toLocaleDateString("id-ID")
      ),

      chartTotals: chartData.rows.map(r =>
        Number(r.total)
      ),

      recentSales: recentSales.rows

    });

  } catch (err) {

    console.error(err);
    res.send("Error dashboard");

  }

});

/* ====================== EXPORT CSV ====================== */

app.get("/dashboard/export", checkAuth, async (req, res) => {

  try {

    const result = await db.query(`
      SELECT 
      DATE(s.created_at) as date,
      s.invoice_number,
      SUM(d.subtotal) as total
      FROM sales s
      JOIN sales_detail d ON d.sale_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);

    let csv = "Date,Invoice,Total\n";

    result.rows.forEach(row => {

      csv += `${row.date},${row.invoice_number},${row.total}\n`;

    });

    res.header("Content-Type", "text/csv");
    res.attachment("sales_report.csv");

    return res.send(csv);

  } catch (err) {

    console.error(err);
    res.send("Export gagal");

  }

});

/* ====================== ROUTES ====================== */

app.use("/members", checkAuth, require("./routes/members"));
app.use("/units", checkAuth, require("./routes/units"));
app.use("/goods", checkAuth, require("./routes/goods"));
app.use("/suppliers", checkAuth, require("./routes/suppliers"));
app.use("/purchases", checkAuth, require("./routes/purchases"));
app.use("/customers", checkAuth, require("./routes/customers"));
app.use("/sales", checkAuth, require("./routes/sales"));

/* ====================== LOGOUT ====================== */

app.get("/logout", (req, res) => {

  req.session.destroy(() => {
    res.redirect("/");
  });

});

/* ====================== ERROR HANDLER ====================== */

app.use((err, req, res, next) => {

  console.error(err.stack);
  res.status(500).send("Terjadi kesalahan server");

});

/* ====================== SERVER ====================== */

app.listen(3000, () => {

  console.log("Server jalan di http://localhost:3000");

});