interface PricingCardProps {
    name: string;
    price: number;
    inputTokens: string;
    outputTokens: string;
    features: string[];
    popular?: boolean;
}

export default function PricingCard({ name, price, inputTokens, outputTokens, features, popular }: PricingCardProps) {
    return (
        <div
            className={`relative flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-1 h-full ${popular
                ? "border-accent bg-gradient-to-b from-accent/5 to-transparent shadow-lg shadow-accent-glow"
                : "border-border bg-bg-card hover:border-border-accent hover:shadow-lg hover:shadow-accent-glow"
                }`}
        >
            {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-accent px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-accent-glow">
                        Phổ biến
                    </span>
                </div>
            )}

            <h3 className="text-base font-semibold text-text-primary">{name}</h3>

            {/* Price */}
            <div className="mt-3 mb-2">
                <span className="text-3xl font-bold text-text-primary">${price}</span>
            </div>

            {/* Token summary */}
            <div className="flex gap-3 mb-5 text-xs">
                <span className="rounded-lg bg-accent/10 text-accent px-2.5 py-1 font-medium">
                    {inputTokens} input
                </span>
                <span className="rounded-lg bg-accent-2/10 text-accent-2 px-2.5 py-1 font-medium">
                    {outputTokens} output
                </span>
            </div>

            <button
                className={`mb-5 w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${popular
                    ? "bg-accent text-white hover:bg-accent-hover hover:shadow-lg hover:shadow-accent-glow"
                    : "border border-border text-text-secondary hover:border-accent hover:text-accent"
                    }`}
            >
                Mua gói token
            </button>

            <ul className="flex-1 space-y-2.5">
                {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`mt-0.5 h-4 w-4 shrink-0 ${popular ? "text-accent" : "text-accent/60"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                    </li>
                ))}
            </ul>
        </div>
    );
}
