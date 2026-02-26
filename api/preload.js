/**
 * Preload .env trước khi bất kỳ module nào được import.
 * File này cần được require() ĐẦU TIÊN trong package.json#scripts hoặc node -r.
 */
const dotenv = require("dotenv");
const path = require("path");

// Khi chạy local: cwd = api/, .env ở ../
// Khi chạy Docker: env_file inject trước, dotenv skip nếu không tìm thấy file
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
