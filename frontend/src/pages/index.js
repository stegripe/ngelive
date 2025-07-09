import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Home() {
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getStatus = async () => {
    const res = await fetch("http://localhost:5000/api/stream/status");
    const data = await res.json();
    setStreaming(data.running);
  };

  useEffect(() => {
    getStatus();
    const interval = setInterval(getStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("http://localhost:5000/api/stream/start", { method: "POST" });
    if (res.ok) {
      setStreaming(true);
    } else {
      const data = await res.json();
      setError(data.error || "Gagal start");
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("http://localhost:5000/api/stream/stop", { method: "POST" });
    if (res.ok) {
      setStreaming(false);
    } else {
      const data = await res.json();
      setError(data.error || "Gagal stop");
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="mb-2">Panel streaming YouTube 24/7. Selamat datang!</p>
      <div className="my-6">
        <div className="text-lg font-semibold mb-2">Status Streaming:</div>
        <div className="flex items-center gap-4">
          <span className={streaming ? "text-green-600" : "text-gray-600"}>
            ● {streaming ? "Sedang LIVE" : "Tidak aktif"}
          </span>
          {streaming ? (
            <button
              onClick={handleStop}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Stop Streaming
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Start Streaming
            </button>
          )}
        </div>
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </div>
      <p className="text-gray-600">Gunakan sidebar kiri untuk mengelola playlist video, upload, dan cek log streaming.</p>
    </div>
  );
}

Home.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
