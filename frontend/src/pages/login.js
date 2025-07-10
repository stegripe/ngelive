import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      router.push("/"); // Atur redirect
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="p-8 max-w-sm mx-auto">
      <h1 className="text-xl font-bold mb-4">Login Admin/User</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          placeholder="Username"
          className="w-full p-2 border rounded"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button className="w-full bg-blue-700 text-white py-2 rounded" type="submit">
          Login
        </button>
        {msg && <div className="text-red-500">{msg}</div>}
      </form>
      <div className="text-xs mt-4 text-gray-500">Default admin login: <b>admin</b> / <b>admin123</b> (ubah setelah deploy!)</div>
    </div>
  );
}
