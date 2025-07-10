import { useState, useEffect } from "react";
import Layout from "../components/Layout";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [videos, setVideos] = useState([]);
  const [streams, setStreams] = useState([]);
  const [videoStreams, setVideoStreams] = useState({}); // { filename: [stream_id, ...] }
  const [loading, setLoading] = useState(true);

  // Fetch all videos
  const fetchVideosAndStreams = async () => {
    setLoading(true);
    const [vres, sres, vsres] = await Promise.all([
      fetch("http://localhost:5000/api/videos"),
      fetch("http://localhost:5000/api/streams"),
      fetch("http://localhost:5000/api/video_streams"),
    ]);
    const videos = await vres.json();
    const streams = await sres.json();
    const videoStreamsList = await vsres.json();
    // Format: { filename: [stream_id, ...] }
    const vsMap = {};
    for (const entry of videoStreamsList) {
      if (!vsMap[entry.filename]) vsMap[entry.filename] = [];
      vsMap[entry.filename].push(entry.stream_id);
    }
    setVideos(videos);
    setStreams(streams);
    setVideoStreams(vsMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideosAndStreams();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setMessage("Pilih file terlebih dahulu!");

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setMessage("Upload berhasil!");
      setFile(null);
      e.target.reset();
      fetchVideosAndStreams();
    } else {
      setMessage("Upload gagal.");
    }

    setUploading(false);
  };

  // Handle checklist change
  const handleVideoStreamCheck = async (filename, stream_id, checked) => {
    if (checked) {
      // Assign video to stream
      await fetch("http://localhost:5000/api/video_streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, stream_id }),
      });
    } else {
      // Unassign
      await fetch("http://localhost:5000/api/video_streams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, stream_id }),
      });
    }
    fetchVideosAndStreams();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload & Kelola Video</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".mp4"
          onChange={handleFileChange}
          className="block"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {message && <div className="mt-4">{message}</div>}

      <div className="mt-8">
        <h2 className="font-bold text-lg mb-2">Daftar Video & Assignment ke Stream</h2>
        {loading ? (
          <div>Memuat...</div>
        ) : videos.length === 0 ? (
          <div className="text-gray-500">Belum ada video.</div>
        ) : (
          <table className="min-w-full text-left border">
            <thead>
              <tr>
                <th className="p-2 border-b">Nama File</th>
                {streams.map((stream) => (
                  <th key={stream.id} className="p-2 border-b text-sm font-normal">
                    Stream: <span className="font-bold">{stream.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v}>
                  <td className="p-2 border-b">{v}</td>
                  {streams.map((stream) => (
                    <td key={stream.id} className="p-2 border-b text-center">
                      <input
                        type="checkbox"
                        checked={videoStreams[v]?.includes(stream.id) || false}
                        onChange={(e) => handleVideoStreamCheck(v, stream.id, e.target.checked)}
                        disabled={loading}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {streams.length === 0 && (
          <div className="text-gray-400 mt-2">Belum ada stream. Tambahkan dulu di Settings & Streams.</div>
        )}
        <div className="mt-2 text-xs text-gray-400">Centang stream di tiap video untuk mengatur video tersebut tampil di stream mana saja.</div>
      </div>
      <div className="mt-6 text-gray-500 text-sm">Hanya file .mp4 yang didukung.</div>
    </div>
  );
}

Upload.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
