import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MvpDashboard from "./routes/mvp";
import './index.css';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MvpDashboard />
  </StrictMode>,
);
