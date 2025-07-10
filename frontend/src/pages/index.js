import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Home() {
  const [streams, setStreams] = useState([]);
  const [status, setStatus] = useState({}); // {stream_id: {running: bool}}
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  // Fetch streams
  const fetchStreams = async () => {
    const res = await fetch("http://localhost:5000/api/streams");
    const data = await res.json();
    setStreams(data);
  };

  // Fetch status per stream
  const fetchStatus = async () => {
    const newStatus = {};
    for (const stream of streams) {
      const res = await fetch(`http://localhost:5000/api/stream/${stream.id}/status`);
      newStatus[stream.id] = await res.json();
    }
    setStatus(newStatus);
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  useEffect(() => {
    if (streams.length > 0) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [streams]);

  const handleStart = async (stream_id) => {
    setLoading((l) => ({ ...l, [stream_id]: true }));
    setError((e) => ({ ...e, [stream_id]: "" }));
    const res = await fetch(`http://localhost:5000/api/stream/${stream_id}/start`, { method: "POST" });
    if (res.ok) {
      fetchStatus();
    } else {
      const data = await res.json();
      setError((e) => ({ ...e, [stream_id]: data.error || "Gagal start" }));
    }
    setLoading((l) => ({ ...l, [stream_id]: false }));
  };

  const handleStop = async (stream_id) => {
    setLoading((l) => ({ ...l, [stream_id]: true }));
    setError((e) => ({ ...e, [stream_id]: "" }));
    const res = await fetch(`http://localhost:5000/api/stream/${stream_id}/stop`, { method: "POST" });
    if (res.ok) {
      fetchStatus();
    } else {
      const data = await res.json();
      setError((e) => ({ ...e, [stream_id]: data.error || "Gagal stop" }));
    }
    setLoading((l) => ({ ...l, [stream_id]: false }));
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="mb-2">Panel streaming YouTube 24/7. Selamat datang!</p>
      {streams.length === 0 ? (
        <div className="text-gray-500">Belum ada stream. Tambahkan dulu di Settings & Streams.</div>
      ) : (
        <div className="space-y-8">
          {streams.map((stream) => (
            <div key={stream.id} className="border rounded px-6 py-4 shadow">
              <div className="mb-2">
                <span className="font-bold text-lg">{stream.name}</span>
                <span className="ml-4 text-gray-500 text-sm">[ID: {stream.id}]</span>
              </div>
              <div className="mb-2">
                <span className="font-mono text-xs">{stream.rtmp_url}</span>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <span className={status[stream.id]?.running ? "text-green-600" : "text-gray-600"}>
                  ● {status[stream.id]?.running ? "Sedang LIVE" : "Tidak aktif"}
                </span>
                {status[stream.id]?.running ? (
                  <button
                    onClick={() => handleStop(stream.id)}
                    disabled={loading[stream.id]}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Stop Streaming
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(stream.id)}
                    disabled={loading[stream.id]}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Start Streaming
                  </button>
                )}
              </div>
              {error[stream.id] && (
                <div className="text-red-500 mt-2">{error[stream.id]}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-gray-600 mt-8">Gunakan sidebar kiri untuk mengelola playlist video, upload, dan cek log streaming.</p>
    </div>
  );
}

Home.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
