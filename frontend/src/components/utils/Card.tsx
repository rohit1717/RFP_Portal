export default function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-[#C7D7EE] border border-[#9BB0D0] rounded-xl p-5 shadow-sm">
            {children}
        </div>
    );
}