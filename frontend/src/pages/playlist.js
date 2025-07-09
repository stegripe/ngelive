import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Playlist() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async () => {
    setLoading(true);
    const res = await fetch("http://localhost:5000/api/videos");
    const data = await res.json();
    setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (filename) => {
    if (!confirm(`Yakin hapus ${filename}?`)) return;
    await fetch(`http://localhost:5000/api/video/${filename}`, { method: "DELETE" });
    fetchVideos();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Playlist Video</h1>
      {loading ? (
        <div>Memuat...</div>
      ) : (
        <table className="min-w-full text-left border">
          <thead>
            <tr>
              <th className="p-2 border-b">Nama File</th>
              <th className="p-2 border-b">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v}>
                <td className="p-2 border-b">{v}</td>
                <td className="p-2 border-b">
                  <button
                    onClick={() => handleDelete(v)}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {videos.length === 0 && (
              <tr>
                <td colSpan={2} className="text-gray-400 p-2">Belum ada video.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

Playlist.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
