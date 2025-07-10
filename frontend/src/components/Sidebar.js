import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 h-screen bg-gray-900 text-white flex flex-col fixed">
      <div className="p-6 font-bold text-2xl border-b border-gray-700">
        Ngelive
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          <li>
            <Link href="/" className="block py-2 px-4 rounded hover:bg-gray-700">
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/upload" className="block py-2 px-4 rounded hover:bg-gray-700">
              Upload
            </Link>
          </li>
          <li>
            <Link href="/settings" className="block py-2 px-4 rounded hover:bg-gray-700">
              Settings & Streams
            </Link>
          </li>
          {user?.role === "admin" && (
            <li>
              <Link href="/admin-users" className="block py-2 px-4 rounded hover:bg-gray-700">
                User Management
              </Link>
            </li>
          )}
          <li>
            <Link href="/logs" className="block py-2 px-4 rounded hover:bg-gray-700">
              Logs
            </Link>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Stegripe Development.
        {user && (
          <div className="mt-2 text-white">
            Login sebagai <b>{user.username}</b> ({user.role})
            <button
              className="ml-2 underline text-blue-200"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
