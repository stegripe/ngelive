import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";

export default function AdminUsers() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" });

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }
    fetchUsers();
    // eslint-disable-next-line
  }, [user]);

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/users", {
      headers: { Authorization: "Bearer " + token }
    });
    if (res.ok) {
      setUsers(await res.json());
    } else {
      setMsg("Gagal ambil user list");
    }
  };

  const handleAdd = async () => {
    setMsg("");
    if (!newUser.username || !newUser.password) return setMsg("Isi semua field.");
    const token = localStorage.getItem("token");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setNewUser({ username: "", password: "", role: "user" });
      fetchUsers();
    } else {
      const err = await res.json();
      setMsg(err.error || "Gagal tambah user");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus user ini?")) return;
    const token = localStorage.getItem("token");
    await fetch("/api/users/" + id, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });
    fetchUsers();
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Manajemen User</h1>
      <div className="mb-4">
        <input
          placeholder="Username"
          className="border p-1 rounded mr-2"
          value={newUser.username}
          onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-1 rounded mr-2"
          value={newUser.password}
          onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
        />
        <select
          className="border p-1 rounded mr-2"
          value={newUser.role}
          onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={handleAdd}>Tambah User</button>
      </div>
      {msg && <div className="text-red-500 mb-2">{msg}</div>}
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">ID</th>
            <th className="border p-2">Username</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Created</th>
            <th className="border p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className="border p-2">{u.id}</td>
              <td className="border p-2">{u.username}</td>
              <td className="border p-2">{u.role}</td>
              <td className="border p-2">{u.created_at}</td>
              <td className="border p-2">
                <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleDelete(u.id)}>Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-400 mt-3">Catatan: Hanya admin yang bisa mengelola user. Tidak ada fitur self-register/reset password.</div>
    </div>
  );
}
