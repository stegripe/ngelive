import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function Playlist() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylist = async () => {
    setLoading(true);
    const res = await fetch("http://localhost:5000/api/playlist");
    let data = await res.json();

    // fallback ke /api/videos jika playlist kosong
    if (!data.length) {
      const fres = await fetch("http://localhost:5000/api/videos");
      data = await fres.json();
    }
    setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const savePlaylist = async (newPlaylist) => {
    await fetch("http://localhost:5000/api/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlist: newPlaylist }),
    });
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Yakin hapus ${filename}?`)) return;
    await fetch(`http://localhost:5000/api/video/${filename}`, { method: "DELETE" });
    fetchPlaylist();
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newVideos = Array.from(videos);
    const [removed] = newVideos.splice(result.source.index, 1);
    newVideos.splice(result.destination.index, 0, removed);
    setVideos(newVideos);
    savePlaylist(newVideos);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Playlist Video</h1>
      {loading ? (
        <div>Memuat...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="videos">
            {(provided) => (
              <table
                className="min-w-full text-left border"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <thead>
                  <tr>
                    <th className="p-2 border-b">Nama File</th>
                    <th className="p-2 border-b">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v, idx) => (
                    <Draggable key={v} draggableId={v} index={idx}>
                      {(provided, snapshot) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? "bg-blue-100" : ""}
                        >
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
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {videos.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-gray-400 p-2">
                        Belum ada video.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
      )}
      <div className="text-sm text-gray-400 mt-2">Urutkan video dengan drag & drop.</div>
    </div>
  );
}

Playlist.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
