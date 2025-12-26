const mongoose = require("mongoose");


module.exports = async () => {
try {
await mongoose.connect(process.env.MONGO_URI, {
// useUnifiedTopology/useNewUrlParser not needed in mongoose v7
});
console.log("✅ MongoDB connected");
} catch (err) {
console.error("❌ MongoDB connection error:", err.message || err);
throw err; // crash: we want to know
}
};