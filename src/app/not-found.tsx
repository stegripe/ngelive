import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="min-h-[60vh] flex items-center justify-center p-6">
			<div className="max-w-md w-full text-center">
				<div className="mx-auto w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-4">
					<FileQuestion className="w-8 h-8 text-violet-600" />
				</div>
				<h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
				<h2 className="text-lg font-medium text-gray-700 mb-4">
					Page Not Found
				</h2>
				<p className="text-gray-500 mb-6">
					The page you're looking for doesn't exist.
				</p>
				<Link href="/">
					<Button className="flex items-center gap-2 mx-auto">
						<Home className="w-4 h-4" />
						Go Home
					</Button>
				</Link>
			</div>
		</div>
	);
}
