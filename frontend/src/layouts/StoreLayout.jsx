import { Outlet } from "react-router-dom";
import ChatWidget from "../components/common/ChatWidget";
import InstallAppPrompt from "../components/common/InstallAppPrompt";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";

export default function StoreLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
      <Footer />
      <InstallAppPrompt />
      <ChatWidget />
    </div>
  );
}
