import Link from "next/link";

interface ToolCardProps {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
}

export default function ToolCard({ title, description, href, icon }: ToolCardProps) {
    return (
        <Link href={href} className="glow-card group rounded-2xl p-5 flex flex-col items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent transition-all group-hover:bg-accent group-hover:text-white group-hover:shadow-lg group-hover:shadow-accent-glow">
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted leading-relaxed">{description}</p>
        </Link>
    );
}
