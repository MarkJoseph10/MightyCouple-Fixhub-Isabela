import { Outlet } from "react-router-dom";
import ChatWidget from "../components/common/ChatWidget";
import InstallAppPrompt from "../components/common/InstallAppPrompt";
import Footer from "../components/layout/Footer";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import Navbar from "../components/layout/Navbar";

export default function StoreLayout() {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <Navbar />
      <Outlet />
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileBottomNav />
      <InstallAppPrompt />
      <ChatWidget />
    </div>
  );
}
