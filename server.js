import dotenv from "dotenv";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";


dotenv.config();
console.log("MONGO_URI:", process.env.MONGO_URI);


connectDB();

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
