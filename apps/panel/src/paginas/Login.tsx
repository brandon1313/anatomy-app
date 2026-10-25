import { useState } from "react";
import { iniciarSesion } from "../api";

export function Login() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(email, contrasena);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="login" onSubmit={entrar}>
      <h1>Anatomía · Panel</h1>
      <label>
        Correo
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Contraseña
        <input type="password" autoComplete="current-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
      </label>
      {error && <p className="error">{error}</p>}
      <button disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
