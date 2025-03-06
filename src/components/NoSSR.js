import React, { useEffect, useState } from 'react';

export default function NoSSR({ children, fallback = null }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return fallback || <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
