import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router";
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
