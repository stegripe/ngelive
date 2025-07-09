import { useState } from "react";
import Layout from "../components/Layout";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

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
    } else {
      setMessage("Upload gagal.");
    }

    setUploading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload Video ke Playlist</h1>
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
      <div className="mt-6 text-gray-500 text-sm">Hanya file .mp4 yang didukung.</div>
    </div>
  );
}

Upload.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
