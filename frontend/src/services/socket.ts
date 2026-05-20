import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socket) {
    return socket;
  }

  const url = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
  socket = io(url, {
    transports: ["websocket"],
    auth: token ? { token } : undefined,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
