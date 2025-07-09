import Layout from "../components/Layout";

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="mb-2">Panel streaming YouTube 24/7. Selamat datang!</p>
      <p className="text-gray-600">Gunakan sidebar kiri untuk mengelola playlist video, upload, dan cek log streaming.</p>
    </div>
  );
}

Home.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};