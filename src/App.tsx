import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import ExtensionAuthorize from './pages/ExtensionAuthorize'
import MobileHome from './pages/MobileHome'
import { useIsMobile } from './hooks/use-mobile'

function ResponsiveHome() {
  return useIsMobile() ? <MobileHome /> : <Home />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ResponsiveHome />} />
      <Route path="/mobile" element={<MobileHome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/extension/authorize" element={<ExtensionAuthorize />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
