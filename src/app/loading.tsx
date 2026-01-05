export default function Loading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
                <p className="text-gray-400">Loading...</p>
            </div>
        </div>
    );
}
