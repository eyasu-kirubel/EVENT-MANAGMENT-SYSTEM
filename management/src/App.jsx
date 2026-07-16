import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import "./App.css";
import { Routes } from "react-router";
import LoginPage from "./pages/login_page";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<h1>REGISTER PAGE</h1>} />
      <Route path="/events" element={<h1>EVENTS PAGE</h1>} />
    </Routes>
  );
}

export default App;
