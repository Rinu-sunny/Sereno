import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Props = React.ComponentProps<typeof Link> & {
  protected?: boolean;
};

const ProtectedLink: React.FC<Props> = ({ protected: isProtected = false, to, children, ...rest }) => {
  const { isAuthenticated, authChecked, setPendingPath, setPendingClosing } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!isProtected) return; // normal link
    // If protected link and user is not yet resolved, prevent navigation and show skeleton
    if (!authChecked || isAuthenticated === null) {
      e.preventDefault();
      setPendingPath?.(to as string);
      setPending(true);
      return;
    }

    // If auth checked and user is unauthenticated, prevent and redirect to /auth
    if (!isAuthenticated) {
      e.preventDefault();
      setPendingPath?.(to as string);
      // use next tick to let skeleton render
      setTimeout(() => {
        setPendingPath?.(null);
        navigate("/auth", { replace: true });
      }, 40);
      return;
    }
  };

  // When pending, react to auth state changes and navigate accordingly
  React.useEffect(() => {
    if (!pending) return;
    if (!authChecked) return;

    setPending(false);
    const doNavigate = (target: string) => {
      // start fade
      setPendingClosing?.(true);
      setTimeout(() => {
        setPendingClosing?.(false);
        setPendingPath?.(null);
        navigate(target, { replace: true });
      }, 300);
    };

    if (isAuthenticated) {
      doNavigate(to as string);
    } else {
      // not authenticated -> go to auth
      doNavigate("/auth");
    }
    // only respond to first resolution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isAuthenticated, pending]);

  return (
    <Link to={to as string} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
};

export default ProtectedLink;
