import Link from "next/link";
import Image from "next/image";

export default function Footer() {
    return (
        <footer className="site-footer border-t border-border bg-bg-secondary">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
                    {/* Brand */}
                    <div className="sm:col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Image src="/logo.png" alt="OCR Universe" width={28} height={28} />
                            <span className="text-sm font-bold text-text-primary">OCR Universe</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed max-w-[200px]">
                            Trích xuất văn bản từ ảnh với công nghệ OCR tiên tiến.
                        </p>
                    </div>

                    {/* Sản phẩm */}
                    <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Sản phẩm</h4>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li><Link href="/" className="hover:text-accent transition-colors">Image to Text</Link></li>
                            <li><Link href="/" className="hover:text-accent transition-colors">Image Translator</Link></li>
                            <li><Link href="/" className="hover:text-accent transition-colors">JPG to Word</Link></li>
                        </ul>
                    </div>

                    {/* Tài nguyên */}
                    <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Tài nguyên</h4>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li><Link href="/pricing" className="hover:text-accent transition-colors">Bảng giá</Link></li>
                            <li><Link href="/" className="hover:text-accent transition-colors">API Docs</Link></li>
                            <li><Link href="/" className="hover:text-accent transition-colors">Hỗ trợ</Link></li>
                        </ul>
                    </div>

                    {/* Pháp lý */}
                    <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Pháp lý</h4>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li><Link href="/" className="hover:text-accent transition-colors">Điều khoản</Link></li>
                            <li><Link href="/" className="hover:text-accent transition-colors">Bảo mật</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
                    <span>© {new Date().getFullYear()} OCR Universe</span>
                    <span>Powered by Tesseract & AI</span>
                </div>
            </div>
        </footer>
    );
}
