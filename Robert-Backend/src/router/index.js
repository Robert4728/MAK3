import express from "express";
const router = express.Router();
import auth from "./auth.js"

router.use("/auth", auth)
router.get("/test", (req, res) => {
  res.send("AUTH ROUTER WORKING");
});


export default router