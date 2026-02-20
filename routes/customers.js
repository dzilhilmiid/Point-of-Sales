const express = require('express');
const router = express.Router();
const db = require('../db');


// LIST + SEARCH + SORT + PAGINATION
router.get('/', async (req, res) => {

  const search = req.query.search || '';
  const sort = req.query.sort || 'name';
  const page = parseInt(req.query.page) || 1;

  const limit = 5;
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) FROM customers
    WHERE name ILIKE $1 OR address ILIKE $1 OR phone ILIKE $1
  `;

  const dataQuery = `
    SELECT * FROM customers
    WHERE name ILIKE $1 OR address ILIKE $1 OR phone ILIKE $1
    ORDER BY ${sort}
    LIMIT $2 OFFSET $3
  `;

  const totalData = await db.query(countQuery, [`%${search}%`]);
  const totalPage = Math.ceil(totalData.rows[0].count / limit);

  const result = await db.query(dataQuery, [`%${search}%`, limit, offset]);

  res.render('customers/index', {
    data: result.rows,
    search,
    sort,
    currentPage: page,
    totalPages: totalPage
  });
});


// FORM ADD
router.get('/add', (req, res) => {
  res.render('customers/add');
});


// STORE
router.post('/add', async (req, res) => {
  const { name, address, phone } = req.body;

  await db.query(
    `INSERT INTO customers(name,address,phone)
     VALUES($1,$2,$3)`,
    [name, address, phone]
  );

  res.redirect('/customers');
});


// FORM EDIT
router.get('/edit/:id', async (req, res) => {

  const result = await db.query(
    `SELECT * FROM customers WHERE id=$1`,
    [req.params.id]
  );

  res.render('customers/edit', { data: result.rows[0] });
});


// UPDATE
router.post('/edit/:id', async (req, res) => {

  const { name, address, phone } = req.body;

  await db.query(
    `UPDATE customers
     SET name=$1,address=$2,phone=$3
     WHERE id=$4`,
    [name, address, phone, req.params.id]
  );

  res.redirect('/customers');
});


// DELETE
router.get('/delete/:id', async (req, res) => {

  await db.query(
    `DELETE FROM customers WHERE id=$1`,
    [req.params.id]
  );

  res.redirect('/customers');
});


module.exports = router;