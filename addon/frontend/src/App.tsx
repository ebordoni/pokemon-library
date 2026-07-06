import { Suspense, lazy } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import CardDetail from "./pages/CardDetail";
import Catalog from "./pages/Catalog";
import Upload from "./pages/Upload";

// Lazy-load Stats so recharts is in a separate chunk and never initialised
// during the initial page load (avoids recharts v3 / iframe crash)
const Stats = lazy(() => import("./pages/Stats"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-pokemon-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/cards/:id" element={<CardDetail />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
