import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Props = {
  children: React.ReactElement;
};

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { authChecked, isAuthenticated } = useAuth();

  // While we're checking auth, don't render anything (NavigationSkeleton handles UI)
  if (!authChecked) return null;

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return children;
};

export default ProtectedRoute;
