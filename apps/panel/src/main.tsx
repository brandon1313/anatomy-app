import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { cerrarSesion, sesionGuardada } from "./api";
import "./estilos.css";
import { Cola } from "./paginas/Cola";
import { Curso } from "./paginas/Curso";
import { EditorEjercicio } from "./paginas/EditorEjercicio";
import { EditorFicha } from "./paginas/EditorFicha";
import { EditorImagen } from "./paginas/EditorImagen";
import { Generar } from "./paginas/Generar";
import { Login } from "./paginas/Login";
import { Publicar } from "./paginas/Publicar";
import { Reportes } from "./paginas/Reportes";

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
        <strong>Palpa · Panel</strong>
        <nav>
          <NavLink to="/cola">Cola de revisión</NavLink>
          <NavLink to="/generar">Generar</NavLink>
          <NavLink to="/curso">Curso</NavLink>
          <NavLink to="/reportes">Reportes</NavLink>
          {usuario.rol === "admin" && <NavLink to="/publicar">Publicar</NavLink>}
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
          <Route path="/imagenes/:id" element={<EditorImagen />} />
          <Route path="/generar" element={<Generar />} />
          <Route path="/curso" element={<Curso />} />
          <Route path="/reportes" element={<Reportes />} />
          {usuario.rol === "admin" && <Route path="/publicar" element={<Publicar />} />}
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
