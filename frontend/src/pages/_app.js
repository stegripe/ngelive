import "../styles/globals.css";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useRouter } from "next/router";

function AuthGuard({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";

  // Jangan render apapun saat user masih null (loading)
  if (user === null && !isLoginPage) return null;

  // Jika belum login dan bukan di halaman login, redirect
  if (!user && !isLoginPage) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }
  // Jika sudah login dan di /login, redirect ke dashboard
  if (user && isLoginPage) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }
  return children;
}

export default function App({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page);
  return (
    <AuthProvider>
      <AuthGuard>
        {getLayout(<Component {...pageProps} />)}
      </AuthGuard>
    </AuthProvider>
  );
}
