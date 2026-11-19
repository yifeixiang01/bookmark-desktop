import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import NotFound from "./pages/NotFound"
import { useIsMobile } from './hooks/use-mobile'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const ExtensionAuthorize = lazy(() => import('./pages/ExtensionAuthorize'))
const MobileHome = lazy(() => import('./pages/MobileHome'))

function ResponsiveHome() {
  return useIsMobile() ? <MobileHome /> : <Home />
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <Routes>
        <Route path="/" element={<ResponsiveHome />} />
        <Route path="/mobile" element={<MobileHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/extension/authorize" element={<ExtensionAuthorize />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
