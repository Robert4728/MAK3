import express from "express"
const app = express();
import dotenv from "dotenv"

dotenv.config({ path: "./src/config/config.env"});
import cors from "cors"
import router from "./router/index.js";
import cookieParser from "cookie-parser"

const allowOrigins = [
    "http://localhost:5173"
] 

app.use(express.json())
app.use(express.urlencoded({extended: true}));
app.use(cookieParser())

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/", router);
// app.get("/", (req, res) => {
//   res.send("Hello from your Node.js server!");
// });

app.listen(3000, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:3000`);
});