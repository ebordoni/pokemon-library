import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import CardDetail from "./pages/CardDetail";
import Catalog from "./pages/Catalog";
import Stats from "./pages/Stats";
import Upload from "./pages/Upload";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/cards/:id" element={<CardDetail />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
