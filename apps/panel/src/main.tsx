import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { cerrarSesion, sesionGuardada } from "./api";
import "./estilos.css";
import { Cola } from "./paginas/Cola";
import { EditorEjercicio } from "./paginas/EditorEjercicio";
import { EditorFicha } from "./paginas/EditorFicha";
import { Generar } from "./paginas/Generar";
import { Login } from "./paginas/Login";

const consultas = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: false } } });

const suscribir = (aviso: () => void) => {
  window.addEventListener("sesion", aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener("sesion", aviso);
    window.removeEventListener("storage", aviso);
  };
};
const leerUsuario = () => JSON.stringify(sesionGuardada()?.usuario ?? null);

function App() {
  const usuario = JSON.parse(useSyncExternalStore(suscribir, leerUsuario));
  if (!usuario) return <Login />;

  return (
    <>
      <header className="barra">
        <strong>Anatomía · Panel</strong>
        <nav>
          <NavLink to="/cola">Cola de revisión</NavLink>
          <NavLink to="/generar">Generar</NavLink>
        </nav>
        <span className="usuario">
          {usuario.nombre} ({usuario.rol})
          <button className="secundario" onClick={() => { consultas.clear(); void cerrarSesion(); }}>
            Salir
          </button>
        </span>
      </header>
      <main>
        <Routes>
          <Route path="/cola" element={<Cola />} />
          <Route path="/fichas/:id" element={<EditorFicha />} />
          <Route path="/ejercicios/:id" element={<EditorEjercicio />} />
          <Route path="/generar" element={<Generar />} />
          <Route path="*" element={<Navigate to="/cola" replace />} />
        </Routes>
      </main>
    </>
  );
}

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <QueryClientProvider client={consultas}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
