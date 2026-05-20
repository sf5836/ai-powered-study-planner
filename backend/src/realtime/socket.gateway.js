import { Server } from "socket.io";
import { env } from "../config/env.js";

let ioInstance = null;

export function attachSocketGateway(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: env.corsOrigin,
      methods: ["GET", "POST"],
    },
  });

  ioInstance.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });

  return ioInstance;
}

export function getSocketGateway() {
  return ioInstance;
}
