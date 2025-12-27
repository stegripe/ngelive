import { type Metadata } from "next";
import { Providers } from "@/providers/providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "ngelive - Live streaming management system",
    description:
        "A web-based platform for managing RTMP live streams with video playlist management, user authentication, and admin controls.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="font-sans">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
