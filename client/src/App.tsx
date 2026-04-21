import { Navigate, Route, Routes } from "react-router-dom";

import { EditorPage } from "./pages/EditorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/room/:roomId" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/room/demo" replace />} />
    </Routes>
  );
}
