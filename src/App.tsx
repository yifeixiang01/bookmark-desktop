import { lazy, Suspense, useEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router";
import NotFound from "./pages/NotFound";
import { useIsMobile } from "./hooks/use-mobile";

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Admin = lazy(() => import("./pages/Admin"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const ExtensionAuthorize = lazy(() => import("./pages/ExtensionAuthorize"));
const MobileHome = lazy(() => import("./pages/MobileHome"));

const MANAGEMENT_HOST = "bookmark-mgmt.yifeixiang.com.cn";

function RootEntry() {
  if (window.location.hostname === MANAGEMENT_HOST)
    return <Navigate to="/admin/login" replace />;
  return <ResponsiveHome />;
}

function ResponsiveHome() {
  return useIsMobile() ? <MobileHome /> : <Home />;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/") || window.location.hostname === MANAGEMENT_HOST;
  useEffect(() => {
    if (!isAdmin) return;
    const previousTitle = document.title;
    const icons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
    const previousIcons = icons.map(icon => ({ href: icon.getAttribute("href"), type: icon.getAttribute("type") }));
    document.title = "书签桌面 · 管理中心";
    icons.forEach(icon => { icon.href = "/admin-icon.svg"; icon.type = "image/svg+xml"; });
    return () => {
      document.title = previousTitle;
      icons.forEach((icon, index) => {
        const previous = previousIcons[index];
        if (previous.href === null) icon.removeAttribute("href"); else icon.setAttribute("href", previous.href);
        if (previous.type === null) icon.removeAttribute("type"); else icon.setAttribute("type", previous.type);
      });
    };
  }, [isAdmin]);
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" aria-busy="true" />}
    >
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/" element={<RootEntry />} />
        <Route path="/mobile" element={<MobileHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/extension/authorize" element={<ExtensionAuthorize />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
