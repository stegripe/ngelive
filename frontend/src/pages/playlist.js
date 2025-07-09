import Layout from "../components/Layout";

export default function Playlist() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Playlist Video</h1>
      <div className="text-gray-500">Daftar video akan tampil di sini.</div>
    </div>
  );
}

Playlist.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};