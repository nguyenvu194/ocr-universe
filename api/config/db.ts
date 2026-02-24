import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

/**
 * PostgreSQL Connection Pool
 *
 * Sử dụng connection pool để tái sử dụng connections,
 * tránh overhead tạo connection mới cho mỗi query.
 */
export const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "ocr_universe",
    user: process.env.DB_USER || "ocr_admin",
    password: process.env.DB_PASSWORD || "ocr_secret_2026",

    // Pool settings
    max: 20,                    // Tối đa 20 connections
    idleTimeoutMillis: 30000,   // Đóng connection idle sau 30s
    connectionTimeoutMillis: 5000, // Timeout kết nối sau 5s
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
    try {
        const client = await pool.connect();
        const result = await client.query("SELECT NOW()");
        client.release();
        console.log(`[DB] Connected to PostgreSQL — ${result.rows[0].now}`);
        return true;
    } catch (error) {
        console.error("[DB] Connection failed:", error);
        return false;
    }
}

/**
 * Helper: Execute query with params
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await pool.query(text, params);
    return result.rows as T[];
}

/**
 * Graceful shutdown
 */
export async function closePool(): Promise<void> {
    await pool.end();
    console.log("[DB] Connection pool closed");
}
