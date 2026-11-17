import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"
import ExtensionAuthorize from './pages/ExtensionAuthorize'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/extension/authorize" element={<ExtensionAuthorize />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
