export default function Empty({ text = "Nothing here yet" }: { text?: string }) {
    return (
        <div className="text-center py-8 text-gray-500">{text}</div>
    );
}