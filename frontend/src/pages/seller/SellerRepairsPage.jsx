import RepairWorkspacePage from "../shared/RepairWorkspacePage";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SellerRepairsPage() {
  const { isRepairTechnician } = useAuth();

  if (!isRepairTechnician) {
    return <Navigate to="/seller/technician" replace />;
  }

  return <RepairWorkspacePage mode="seller" />;
}
