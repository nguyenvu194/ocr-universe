import * as fs from 'fs';
import * as path from 'path';
import { OCRManager } from './core/OCRManager';
import { AIProcessor } from './services/AIProcessor';
import { OCRResult } from './core/interfaces';

// ─── Cấu hình ────────────────────────────────────────────
const SAMPLES_DIR = path.resolve(__dirname, '../tests/samples');
const RESULTS_DIR = path.resolve(__dirname, '../tests/results');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'];

// ─── Loại dữ liệu ────────────────────────────────────────
interface TestResult {
    fileName: string;
    provider: string;
    confidence: number;
    ocrTimeMs: number;
    aiMethod: string;
    totalTimeMs: number;
}

// ─── Hàm chính ────────────────────────────────────────────
async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║        OCR E2E TEST — Bắt đầu           ║');
    console.log('╚══════════════════════════════════════════╝\n');

    // Kiểm tra thư mục samples
    if (!fs.existsSync(SAMPLES_DIR)) {
        console.error(`❌ Không tìm thấy thư mục: ${SAMPLES_DIR}`);
        process.exit(1);
    }

    // Tạo thư mục results nếu chưa có
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
        console.log(`📁 Đã tạo thư mục: ${RESULTS_DIR}\n`);
    }

    // Quét file ảnh
    const allFiles = fs.readdirSync(SAMPLES_DIR);
    const imageFiles = allFiles.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
    });

    if (imageFiles.length === 0) {
        console.error('❌ Không tìm thấy file ảnh nào trong thư mục samples.');
        process.exit(1);
    }

    console.log(`🖼️  Tìm thấy ${imageFiles.length} file ảnh: ${imageFiles.join(', ')}\n`);

    // Khởi tạo
    const manager = OCRManager.getInstance();
    const provider = manager.getProvider();
    const aiProcessor = new AIProcessor();
    const results: TestResult[] = [];

    // Xử lý từng ảnh
    for (let i = 0; i < imageFiles.length; i++) {
        const fileName = imageFiles[i];
        const imagePath = path.join(SAMPLES_DIR, fileName);
        const baseName = path.parse(fileName).name;
        const totalStart = Date.now();

        console.log(`━━━ [${i + 1}/${imageFiles.length}] ${fileName} ━━━`);

        // Bước 1: OCR
        console.log(`  🔍 Đang chạy OCR (${provider.getProviderName()})...`);
        let ocrResult: OCRResult;
        try {
            ocrResult = await provider.recognize(imagePath);
        } catch (err) {
            console.error(`  ❌ OCR thất bại: ${err}`);
            continue;
        }

        console.log(`  ✅ OCR xong — Confidence: ${ocrResult.confidence.toFixed(1)}% | Thời gian: ${ocrResult.processingTimeMs}ms`);

        // Bước 2: AI Processing
        console.log(`  🤖 Đang xử lý hậu kỳ (AIProcessor)...`);
        const processed = await aiProcessor.reconstruct(ocrResult.text, ocrResult.confidence);
        console.log(`  ✅ Phương thức: ${processed.method}`);

        const totalTimeMs = Date.now() - totalStart;

        // Bước 3: Ghi kết quả
        const jsonOutput = {
            fileName,
            provider: provider.getProviderName(),
            ocrConfidence: ocrResult.confidence,
            ocrProcessingTimeMs: ocrResult.processingTimeMs,
            totalProcessingTimeMs: totalTimeMs,
            aiMethod: processed.method,
            rawText: ocrResult.text,
            cleanedText: processed.cleanedText,
            corrections: processed.corrections,
        };

        const jsonPath = path.join(RESULTS_DIR, `${baseName}.json`);
        const txtPath = path.join(RESULTS_DIR, `${baseName}.txt`);

        fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf-8');
        fs.writeFileSync(txtPath, processed.cleanedText, 'utf-8');

        console.log(`  💾 Đã lưu: ${baseName}.json + ${baseName}.txt\n`);

        results.push({
            fileName,
            provider: provider.getProviderName(),
            confidence: ocrResult.confidence,
            ocrTimeMs: ocrResult.processingTimeMs,
            aiMethod: processed.method,
            totalTimeMs,
        });
    }

    // ─── Bảng tóm tắt ────────────────────────────────────
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          KẾT QUẢ TỔNG HỢP                              ║');
    console.log('╠════════════════════════╦═══════════╦═══════════╦══════════╦══════════════╣');
    console.log('║ File                   ║ Provider  ║ Conf. (%) ║ OCR (ms) ║ Tổng (ms)    ║');
    console.log('╠════════════════════════╬═══════════╬═══════════╬══════════╬══════════════╣');

    for (const r of results) {
        const name = r.fileName.padEnd(22);
        const prov = r.provider.padEnd(9);
        const conf = r.confidence.toFixed(1).padStart(9);
        const ocrT = String(r.ocrTimeMs).padStart(8);
        const totT = String(r.totalTimeMs).padStart(12);
        console.log(`║ ${name} ║ ${prov} ║ ${conf} ║ ${ocrT} ║ ${totT} ║`);
    }

    console.log('╚════════════════════════╩═══════════╩═══════════╩══════════╩══════════════╝');
    console.log(`\n✅ Hoàn tất! Kết quả lưu tại: ${RESULTS_DIR}`);
}

main().catch(err => {
    console.error('❌ Lỗi không xử lý được:', err);
    process.exit(1);
});
