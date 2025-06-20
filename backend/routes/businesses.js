// backend/routes/businesses.js
const express = require("express");
const router = express.Router();

// --- CHANGE 1: Use the promise-based connection ---
// Get the promise-based connection object for async/await support.
const db = require("../dbSingleton").getPromise();

/* ───────────────────────────────
   1. Create a new business (POST /api/businesses)
   Refactored with async/await.
   ─────────────────────────────── */
router.post("/", async (req, res) => { // <-- Add async
  const {
    name, category, description, phone, email, address, image_url = "", opening_hours = "",
  } = req.body;

  const sql = `
    INSERT INTO businesses (name, category, description, phone, email, address, image_url, opening_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [name, category, description, phone, email, address, image_url, opening_hours];

  try {
    // --- CHANGE 2: Use await and a try...catch block ---
    const [result] = await db.query(sql, params); // <-- Use await
    res.status(201).json({ id: result.insertId, message: "Business created" });
  } catch (err) {
    console.error("DB error creating business:", err);
    res.status(500).json({ error: "Failed to create business." });
  }
});

/* ───────────────────────────────
   2. Get unique categories (GET /api/businesses/categories)
   Returns list of unique categories from businesses table.
   ─────────────────────────────── */
router.get("/categories", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DISTINCT category FROM businesses WHERE category IS NOT NULL AND category != '' ORDER BY category ASC"
    );
    const categories = rows.map(row => row.category);
    res.json(categories);
  } catch (err) {
    console.error("DB error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories." });
  }
});

/* ───────────────────────────────
   3. Get all businesses (GET /api/businesses)
   Refactored with async/await.
   ─────────────────────────────── */
router.get("/", async (_req, res) => { // <-- Add async
  try {
    const [rows] = await db.query("SELECT * FROM businesses"); // <-- Use await
    res.json(rows);
  } catch (err) {
    console.error("DB error fetching all businesses:", err);
    res.status(500).json({ error: "Failed to fetch businesses." });
  }
});

/* ───────────────────────────────
   4. Get a single business by ID (GET /api/businesses/:id)
   Refactored with async/await.
   ─────────────────────────────── */
router.get("/:id", async (req, res) => { // <-- Add async
  const sql = "SELECT * FROM businesses WHERE business_id = ?";
  const params = [req.params.id];

  try {
    const [rows] = await db.query(sql, params); // <-- Use await
    
    // Check if a business was found
    if (rows.length === 0) {
      return res.status(404).json({ message: "Business not found" });
    }
    
    res.json(rows[0]); // Send the first (and only) result
  } catch (err) {
    console.error(`DB error fetching business with id ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch business details." });
  }
});

/* ───────────────────────────────
   5. Update a business (PUT /api/businesses/:id)
   Refactored with async/await.
   ─────────────────────────────── */
router.put("/:id", async (req, res) => { // <-- Add async
  const {
    name, category, description, phone, email, address, image_url = "", opening_hours = "",
  } = req.body;

  const sql = `
    UPDATE businesses SET name = ?, category = ?, description = ?, phone = ?, email = ?,
    address = ?, image_url = ?, opening_hours = ?
    WHERE business_id = ?
  `;
  const params = [name, category, description, phone, email, address, image_url, opening_hours, req.params.id];

  try {
    const [result] = await db.query(sql, params); // <-- Use await
    
    // Check if any row was actually updated
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Business not found" });
    }
    
    res.json({ message: "Business updated successfully" });
  } catch (err) {
    console.error(`DB error updating business with id ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update business." });
  }
});


/* ───────────────────────────────
   6. Get services for a specific business (GET /api/businesses/:id/services)
   Returns list of services for a specific business.
   ─────────────────────────────── */
router.get("/:id/services", async (req, res) => {
  try {
    // First check if business exists
    const [businessRows] = await db.query(
      "SELECT business_id FROM businesses WHERE business_id = ?",
      [req.params.id]
    );
    
    if (businessRows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Fetch services for this business - using correct column name from database
    const [services] = await db.query(
      "SELECT service_id, name, description, price, duration_minutes as duration FROM services WHERE business_id = ? ORDER BY name ASC",
      [req.params.id]
    );
    
    res.json(services);
  } catch (err) {
    console.error(`DB error fetching services for business ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch services." });
  }
});

/* ───────────────────────────────
   7. Create a service for a business (POST /api/businesses/:id/services)
   Creates a new service for a specific business.
   ─────────────────────────────── */
router.post("/:id/services", async (req, res) => {
  const { name, description, price, duration } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required" });
  }

  try {
    // First check if business exists
    const [businessRows] = await db.query(
      "SELECT business_id FROM businesses WHERE business_id = ?",
      [req.params.id]
    );
    
    if (businessRows.length === 0) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Create the service - using correct column name from database
    const [result] = await db.query(
      "INSERT INTO services (business_id, name, description, price, duration_minutes) VALUES (?, ?, ?, ?, ?)",
      [req.params.id, name, description || '', price, duration || null]
    );
    
    res.status(201).json({
      service_id: result.insertId,
      business_id: req.params.id,
      name,
      description: description || '',
      price,
      duration: duration || null,
      message: "Service created successfully"
    });
  } catch (err) {
    console.error(`DB error creating service for business ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to create service." });
  }
});

module.exports = router;