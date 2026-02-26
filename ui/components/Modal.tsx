"use client";

/**
 * Shared Modal Component
 *
 * Reusable overlay modal with:
 *   - Framer Motion fade + scale animation
 *   - Click-backdrop-to-close
 *   - Close (X) button
 *   - Dark theme consistent with app design
 */

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    /** Tailwind max-width class, default: "max-w-lg" */
    maxWidth?: string;
    children: ReactNode;
}

export default function Modal({ open, onClose, title, maxWidth = "max-w-lg", children }: ModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className={`relative w-full ${maxWidth} rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl overflow-hidden`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {title && (
                            <h3 className="text-sm font-semibold text-white mb-4 pr-8">
                                {title}
                            </h3>
                        )}

                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
