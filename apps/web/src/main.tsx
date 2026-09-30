import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  override state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#070b14", color: "#f1f5f9", fontFamily: "monospace",
          padding: "2rem", gap: "1rem"
        }}>
          <div style={{ fontSize: "2rem" }}>⚠️</div>
          <h1 style={{ color: "#f43f5e", margin: 0 }}>Something went wrong</h1>
          <pre style={{
            background: "#111827", padding: "1rem", borderRadius: "8px",
            color: "#94a3b8", fontSize: "0.8rem", maxWidth: "700px",
            overflow: "auto", whiteSpace: "pre-wrap"
          }}>
            {(this.state.error as Error).message}
            {"\n\n"}
            {(this.state.error as Error).stack}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
            style={{
              padding: "0.5rem 1.5rem", background: "#6366f1", color: "white",
              border: "none", borderRadius: "8px", cursor: "pointer"
            }}
          >
            Go to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
