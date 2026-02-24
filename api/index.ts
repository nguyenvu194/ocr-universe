/**
 * OCR Universe — Backend Entry Point
 *
 * Khởi tạo Express server với:
 *   - Auth module (/auth)
 *   - Database connection test
 *   - Graceful shutdown
 */

import express from "express";
import dotenv from "dotenv";
import { testConnection, closePool } from "./config/db";
import authRoutes from "./modules/auth/auth.routes";
import billingRoutes from "./modules/billing/billing.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import cronRoutes from "./modules/cron/cron.routes";
import { authMiddleware } from "./middleware/auth.middleware";

// Load .env
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// ─── Global Middleware ───────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS (cho phép frontend Next.js gọi API)
// const serverUrl = process.env.SERVER_URL || "http://localhost";
// app.use((_req, res, next) => {
//     res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL || `${serverUrl}:3001`);
//     res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
//     res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//     if (_req.method === "OPTIONS") {
//         return res.sendStatus(200);
//     }
//     next();
// });

const serverUrl = process.env.SERVER_URL || "http://localhost";
// Ưu tiên lấy FRONTEND_URL từ môi trường, nếu không có mới dùng serverUrl gốc
const frontendUrl = process.env.FRONTEND_URL || serverUrl;

app.use((_req, res, next) => {
    const origin = _req.headers.origin;

    // Kiểm tra nếu origin gửi lên khớp với cấu hình của chúng ta
    if (origin === frontendUrl || origin === `${serverUrl}:3001`) {
        res.header("Access-Control-Allow-Origin", origin);
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // CỰC KỲ QUAN TRỌNG cho Google Login
    res.header("Access-Control-Allow-Credentials", "true");

    if (_req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// ─── Routes ──────────────────────────────────────────────

app.use("/auth", authRoutes);
app.use("/api/billing", authMiddleware, billingRoutes);
app.use("/payment", paymentRoutes);
app.use("/api/cron", cronRoutes);

// ─── Public: Lấy constant theo code ──────────────────────────
app.get("/api/constants/:code", async (req, res) => {
    try {
        const { query: dbQuery } = require("./config/db");
        const [row] = await dbQuery(
            `SELECT code, value, name, description FROM constants WHERE code = $1 AND is_enabled = true`,
            [req.params.code]
        );
        if (!row) return res.status(404).json({ success: false, error: "Not found" });
        return res.json({ success: true, data: row });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Health check
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// 404 fallback
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Route không tồn tại" },
    });
});

// ─── Start Server ────────────────────────────────────────

async function bootstrap() {
    // Test DB connection
    const dbOk = await testConnection();
    if (!dbOk) {
        console.error("[Server] Không thể kết nối database. Dừng server.");
        process.exit(1);
    }


    app.listen(PORT, () => {
        console.log(`\n🚀 OCR Universe Backend running at http://localhost:${PORT}`);
        console.log(`   Auth:   POST /auth/register, /auth/login, /auth/google`);
        console.log(`           GET  /auth/me (Bearer token)`);
        console.log(`   Health: GET  /health\n`);
    });
}

// ─── Graceful Shutdown ───────────────────────────────────

process.on("SIGINT", async () => {
    console.log("\n[Server] Shutting down...");
    await closePool();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("\n[Server] Shutting down...");
    await closePool();
    process.exit(0);
});

bootstrap().catch((err) => {
    console.error("[Server] Bootstrap failed:", err);
    process.exit(1);
});
