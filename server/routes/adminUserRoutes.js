const express = require("express");
const router = express.Router();
const { getAllUsers, deleteUser } = require("../controllers/adminUserController");

router.get("/api/admin/users", getAllUsers);
router.delete("/api/admin/users/:id", deleteUser);

module.exports = router;
