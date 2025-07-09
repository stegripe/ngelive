import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-gray-900 text-white flex flex-col fixed">
      <div className="p-6 font-bold text-2xl border-b border-gray-700">
        YT Streamer
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          <li>
            <Link href="/" className="block py-2 px-4 rounded hover:bg-gray-700">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/playlist" className="block py-2 px-4 rounded hover:bg-gray-700">
              Playlist
            </Link>
          </li>
          <li>
            <Link href="/upload" className="block py-2 px-4 rounded hover:bg-gray-700">
              Upload
            </Link>
          </li>
          <li>
            <Link href="/settings" className="block py-2 px-4 rounded hover:bg-gray-700">
              Settings
            </Link>
          </li>
          <li>
            <Link href="/logs" className="block py-2 px-4 rounded hover:bg-gray-700">
              Logs
            </Link>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Stegripe
      </div>
    </aside>
  );
}