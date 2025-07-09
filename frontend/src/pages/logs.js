import { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";

export default function Logs() {
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await fetch("http://localhost:5000/api/logs");
    const data = await res.text();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000); // refresh setiap 3 detik
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Log Streaming</h1>
      <div className="mb-2 flex items-center gap-2">
        <label>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={() => setAutoScroll(!autoScroll)}
          />{" "}
          Auto-scroll
        </label>
        <button
          onClick={fetchLogs}
          className="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded text-sm"
        >
          Refresh
        </button>
      </div>
      <div
        ref={logRef}
        style={{
          background: "#111",
          color: "#0f0",
          fontFamily: "monospace",
          fontSize: "13px",
          padding: "12px",
          borderRadius: "6px",
          minHeight: "340px",
          maxHeight: "480px",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {loading ? "Loading log..." : logs || "Log kosong."}
      </div>
    </div>
  );
}

Logs.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
