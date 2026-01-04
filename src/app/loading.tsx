import { Loader2 } from "lucide-react";

export default function Loading() {
	return (
		<div className="min-h-[60vh] flex items-center justify-center">
			<Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
		</div>
	);
}
