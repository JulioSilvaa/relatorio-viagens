"use client";

import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

export function ConnectivityIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning/10 px-4 py-2 text-sm text-warning"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      <span>
        Você está offline. As alterações serão salvas neste dispositivo e
        enviadas quando a conexão voltar.
      </span>
    </div>
  );
}

export function OnlineStatusDot() {
  const online = useOnlineStatus();

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {online ? (
        <>
          <Wifi className="size-3.5 text-success" aria-hidden="true" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="size-3.5 text-warning" aria-hidden="true" />
          Offline
        </>
      )}
    </span>
  );
}
