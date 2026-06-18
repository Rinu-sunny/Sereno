import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Props = {
  children: React.ReactElement;
};

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { authChecked, isAuthenticated } = useAuth();
  const location = useLocation();

  // While we're checking auth, don't render anything (NavigationSkeleton handles UI)
  if (!authChecked) return null;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
