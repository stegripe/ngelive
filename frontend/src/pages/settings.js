import { useState, useEffect } from "react";
import Layout from "../components/Layout";

export default function Settings() {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/rtmp")
      .then((res) => res.json())
      .then((data) => setUrl(data.url || ""));
  }, []);

  const saveUrl = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("http://localhost:5000/api/rtmp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("RTMP URL berhasil disimpan!");
    } else {
      const data = await res.json();
      setMsg(data.error || "Gagal simpan.");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Pengaturan RTMP</h1>
      <form onSubmit={saveUrl} className="space-y-4">
        <label className="block">
          RTMP URL/KEY:
          <input
            type="text"
            className="w-full mt-2 px-3 py-2 border rounded"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY"
          />
        </label>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={saving}
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {msg && <div className="mt-2">{msg}</div>}
      </form>
      <div className="mt-4 text-gray-500 text-sm">
        Masukkan full RTMP URL tujuan streaming, misal: <br />
        <code>rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx-xxxx-xxxx</code>
      </div>
    </div>
  );
}

Settings.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
