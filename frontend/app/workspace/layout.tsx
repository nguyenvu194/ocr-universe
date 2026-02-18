export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <style>{`
                footer.site-footer { display: none !important; }
                main { min-height: auto !important; }
            `}</style>
            {children}
        </>
    );
}
