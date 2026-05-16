import dotenv from "dotenv";

dotenv.config();


import app from "./src/app.js";
import connectDB from "./src/config/db.js";


console.log("ENV CHECK: ", process.env.RESEND_API_KEY);
console.log("MONGO_URI:", process.env.MONGO_URI);


connectDB();

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
