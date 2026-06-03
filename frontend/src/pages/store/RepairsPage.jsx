import { Navigate } from "react-router-dom";
import RepairWorkspacePage from "../shared/RepairWorkspacePage";
import { useAuth } from "../../context/AuthContext";

export default function RepairsPage() {
  const { isAdmin, isSeller, isSellerAccount, isRepairTechnician } = useAuth();

  if (isAdmin) {
    return <Navigate to="/admin/repairs" replace />;
  }

  if (isSeller) {
    return <Navigate to={isRepairTechnician ? "/seller/repairs" : "/seller/technician"} replace />;
  }

  if (isSellerAccount && !isSeller) {
    return <Navigate to="/seller/appeal" replace />;
  }

  return <RepairWorkspacePage mode="customer" />;
}
