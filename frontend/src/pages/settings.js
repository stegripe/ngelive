import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function Settings() {
  const [streams, setStreams] = useState([]);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState(null); // stream_id yang sedang di-expand playlistnya

  // State untuk tambah stream
  const [newName, setNewName] = useState("");
  const [newRtmp, setNewRtmp] = useState("");
  const [playlistCache, setPlaylistCache] = useState({}); // {stream_id: [files]}
  const [assignableVideos, setAssignableVideos] = useState({}); // {stream_id: [videos yang di-assign]}
  const [playlistLoading, setPlaylistLoading] = useState({});

  // Fetch semua stream
  const fetchStreams = async () => {
    setLoadingStreams(true);
    const res = await fetch("http://localhost:5000/api/streams");
    const data = await res.json();
    setStreams(data);
    setLoadingStreams(false);
  };

  // Fetch semua video yang bisa di assign untuk tiap stream
  const fetchAssignableVideos = async () => {
    const sres = await fetch("http://localhost:5000/api/streams");
    const streams = await sres.json();
    const vsres = await fetch("http://localhost:5000/api/video_streams");
    const videoStreams = await vsres.json();
    const vres = await fetch("http://localhost:5000/api/videos");
    const allVideos = await vres.json();
    // Buat map video2 yang terassign untuk tiap stream
    const res = {};
    for (const stream of streams) {
      res[stream.id] = allVideos.filter(v =>
        videoStreams.some(entry => entry.stream_id === stream.id && entry.filename === v)
      );
    }
    setAssignableVideos(res);
  };

  // Fetch playlist satu stream
  const fetchPlaylist = async (stream_id) => {
    setPlaylistLoading((l) => ({ ...l, [stream_id]: true }));
    const res = await fetch(`http://localhost:5000/api/playlist/${stream_id}`);
    let data = await res.json();
    setPlaylistCache((cache) => ({ ...cache, [stream_id]: data }));
    setPlaylistLoading((l) => ({ ...l, [stream_id]: false }));
  };

  useEffect(() => {
    fetchStreams();
    fetchAssignableVideos();
    // eslint-disable-next-line
  }, []);

  // Expand panel playlist stream
  const handleExpand = (stream_id) => {
    setExpanded(expanded === stream_id ? null : stream_id);
    if (expanded !== stream_id) fetchPlaylist(stream_id);
  };

  // Tambah stream
  const addStream = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("http://localhost:5000/api/streams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, rtmp_url: newRtmp }),
    });
    if (res.ok) {
      setNewName("");
      setNewRtmp("");
      setMsg("Berhasil tambah stream!");
      await fetchStreams();
      await fetchAssignableVideos();
      setExpanded(null); // Reset expanded supaya user bisa klik stream baru
    } else {
      setMsg("Gagal tambah stream.");
    }
  };

  // Hapus stream
  const deleteStream = async (id) => {
    if (!confirm("Yakin hapus stream ini beserta playlistnya?")) return;
    await fetch(`http://localhost:5000/api/streams/${id}`, { method: "DELETE" });
    await fetchStreams();
    await fetchAssignableVideos();
    setExpanded(null);
  };

  // Update RTMP URL & nama
  const saveStream = async (id, name, url) => {
    await fetch(`http://localhost:5000/api/streams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rtmp_url: url }),
    });
    setMsg("Berhasil update RTMP & nama stream!");
    await fetchStreams();
  };

  // Playlist logic
  const savePlaylist = async (stream_id, newPlaylist) => {
    await fetch(`http://localhost:5000/api/playlist/${stream_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlist: newPlaylist }),
    });
    setPlaylistCache((cache) => ({ ...cache, [stream_id]: newPlaylist }));
  };

  // Drag n drop playlist
  const onDragEnd = (stream_id, result) => {
    if (!result.destination) return;
    // Gabungkan playlistCache dan assignableVideos yang belum ada di playlistCache
    const currentList = [
      ...(playlistCache[stream_id] || []),
      ...(assignableVideos[stream_id] || []).filter(
        v => !(playlistCache[stream_id] || []).includes(v)
      ),
    ];
    const newVideos = Array.from(currentList);
    const [removed] = newVideos.splice(result.source.index, 1);
    newVideos.splice(result.destination.index, 0, removed);
    // Simpan hanya urutan video yang benar-benar ada di playlist (bukan semua yang belum diurutkan)
    const assignableSet = new Set(assignableVideos[stream_id] || []);
    savePlaylist(stream_id, newVideos.filter(v => assignableSet.has(v)));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Kelola Semua RTMP Stream & Playlist</h1>
      {/* --- TUTORIAL/DESKRIPSI --- */}
      <div className="mb-4 text-gray-700 text-sm">
        <ul className="list-disc ml-5">
          <li>Masukkan <b>Nama Stream</b> sesuai kebutuhan channel YouTube atau platform lain.</li>
          <li>Contoh <b>RTMP URL</b>: <span className="font-mono bg-gray-100 px-1">rtmp://a.rtmp.youtube.com/live2/abcd-1234-xxxx-9999</span></li>
          <li>Setelah tambah stream, klik <b>Kelola Playlist</b> untuk mengatur urutan video yang akan diputar otomatis.</li>
          <li>Video yang bisa dipilih ke playlist hanya yang dicentang untuk stream ini di halaman <b>Upload & Kelola Video</b>.</li>
        </ul>
      </div>
      {/* --- END TUTORIAL/DESKRIPSI --- */}
      <form onSubmit={addStream} className="space-y-2 mb-6">
        <div>
          <input
            type="text"
            placeholder="Nama Stream"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="p-2 border rounded mr-2"
            required
          />
          <input
            type="text"
            placeholder="RTMP URL"
            value={newRtmp}
            onChange={(e) => setNewRtmp(e.target.value)}
            className="p-2 border rounded mr-2"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tambah Stream
          </button>
        </div>
        {msg && <div className="text-green-600">{msg}</div>}
      </form>
      {loadingStreams ? (
        <div>Memuat daftar stream...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="border rounded shadow p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <input
                  type="text"
                  className="text-lg font-semibold border rounded px-2 py-1 mr-2 w-full md:w-1/4"
                  value={stream.name}
                  onChange={(e) =>
                    setStreams((s) =>
                      s.map((st) =>
                        st.id === stream.id ? { ...st, name: e.target.value } : st
                      )
                    )
                  }
                />
                <input
                  type="text"
                  className="text-sm border rounded px-2 py-1 mr-2 w-full md:w-2/4"
                  value={stream.rtmp_url}
                  onChange={(e) =>
                    setStreams((s) =>
                      s.map((st) =>
                        st.id === stream.id ? { ...st, rtmp_url: e.target.value } : st
                      )
                    )
                  }
                />
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  onClick={() => saveStream(stream.id, stream.name, stream.rtmp_url)}
                >
                  Simpan RTMP & Nama
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                  onClick={() => deleteStream(stream.id)}
                >
                  Hapus Stream
                </button>
                <button
                  className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-700"
                  onClick={() => handleExpand(stream.id)}
                >
                  {expanded === stream.id ? "Tutup Playlist" : "Kelola Playlist"}
                </button>
              </div>
              {expanded === stream.id && (
                <div className="mt-4">
                  <h2 className="font-bold mb-2">Playlist Video [Stream {stream.id}]</h2>
                  {playlistLoading[stream.id] ? (
                    <div>Memuat playlist...</div>
                  ) : (
                    <>
                      {(assignableVideos[stream.id]?.length || 0) === 0 ? (
                        <div className="text-gray-500">Belum ada video yang di-assign ke stream ini. Silakan assign di Upload & Kelola Video.</div>
                      ) : (
                        <DragDropContext
                          onDragEnd={(result) => onDragEnd(stream.id, result)}
                        >
                          <Droppable droppableId={`videos-${stream.id}`}>
                            {(provided) => {
                              // Gabungkan playlistCache dan assignableVideos yang belum ada di playlistCache
                              const allVideos = [
                                ...(playlistCache[stream.id] || []),
                                ...(assignableVideos[stream.id] || []).filter(
                                  v => !(playlistCache[stream.id] || []).includes(v)
                                ),
                              ];
                              return (
                                <table
                                  className="min-w-full text-left border"
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                >
                                  <thead>
                                    <tr>
                                      <th className="p-2 border-b">Nama File</th>
                                      <th className="p-2 border-b">Urutan Playlist</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {allVideos.map((v, idx) => (
                                      <Draggable key={v} draggableId={v} index={idx}>
                                        {(provided, snapshot) => (
                                          <tr
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={
                                              snapshot.isDragging
                                                ? "bg-blue-100"
                                                : (playlistCache[stream.id] || []).includes(v)
                                                ? ""
                                                : "bg-gray-100 text-gray-500"
                                            }
                                          >
                                            <td className="p-2 border-b">{v}</td>
                                            <td className="p-2 border-b">
                                              {(playlistCache[stream.id] || []).includes(v)
                                                ? (playlistCache[stream.id] || []).indexOf(v) + 1
                                                : "Belum masuk playlist"}
                                            </td>
                                          </tr>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    {allVideos.length === 0 && (
                                      <tr>
                                        <td colSpan={2} className="text-gray-400 p-2">
                                          Belum ada video yang diassign ke stream ini.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              );
                            }}
                          </Droppable>
                        </DragDropContext>
                      )}
                      <div className="text-sm text-gray-400 mt-2">
                        Urutkan video dengan drag & drop. Hanya video yang dicentang untuk stream ini di Upload & Kelola Video yang bisa dipilih di playlist.
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {streams.length === 0 && (
            <div className="text-gray-400">Belum ada stream.</div>
          )}
        </div>
      )}
    </div>
  );
}

Settings.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};
