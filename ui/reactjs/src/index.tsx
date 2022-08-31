import React from "react";
import { createRoot } from "react-dom/client";
import reportWebVitals from "./reportWebVitals.ts";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Styles
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/global.css";

// Components
import ProtectedRoutes from "./components/ProtectedRoutes.tsx";
import Home from "./components/Home.tsx";
import Profile from "./components/Profile.tsx";
import Login from "./components/Login.tsx";
import LogOut from "./components/LogOut.tsx";
import NotFound from "./NotFound.tsx";
import Settings from "./components/Settings.tsx";
import Chat from "./chat/Chat.tsx";
import Pong from "./pong/Pong.tsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/user/logout" element={<LogOut />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/play" element={<Pong />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/" element={<Home />} />
          <Route path="/user/profile/:id" element={<Profile />} />
          <Route path="/user/logout" element={<LogOut />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);

reportWebVitals();
