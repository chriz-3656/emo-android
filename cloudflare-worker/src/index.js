export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Use websocket endpoint.", { status: 400 });
    }

    const authOk = verifyToken(url, env);
    if (!authOk) {
      return new Response("Unauthorized", { status: 401 });
    }

    const petMatch = url.pathname.match(/^\/ws\/pet\/([^/]+)$/);
    const dashMatch = url.pathname.match(/^\/ws\/dashboard\/([^/]+)$/);
    if (!petMatch && !dashMatch) {
      return new Response("Not found", { status: 404 });
    }

    const petId = decodeURIComponent((petMatch || dashMatch)[1]);
    const role = petMatch ? "pet" : "dashboard";
    const roomId = env.ROOMS.idFromName(petId);
    const room = env.ROOMS.get(roomId);
    const forward = new Request(`https://room.internal/connect?role=${role}`, request);
    return room.fetch(forward);
  }
};

function verifyToken(url, env) {
  const provided = (url.searchParams.get("token") || "").trim();
  const expected = (env.REMOTE_TOKEN || "").trim();
  return provided.length > 0 && expected.length > 0 && provided === expected;
}

export class PetRoom {
  constructor(state) {
    this.state = state;
    this.peers = new Map();
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("WebSocket expected.", { status: 400 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    if (!role || (role !== "pet" && role !== "dashboard")) {
      return new Response("Invalid role.", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.peers.set(server, role);

    server.addEventListener("message", (event) => {
      this.handleMessage(server, role, event.data);
    });
    server.addEventListener("close", () => {
      this.peers.delete(server);
    });
    server.addEventListener("error", () => {
      this.peers.delete(server);
    });

    this.send(server, { type: "ack", role, ok: true });
    return new Response(null, { status: 101, webSocket: client });
  }

  handleMessage(sender, role, raw) {
    let message = null;
    try {
      message = JSON.parse(raw);
    } catch (_error) {
      this.send(sender, { type: "ack", ok: false, error: "invalid-json" });
      return;
    }

    if (!message || typeof message !== "object") {
      this.send(sender, { type: "ack", ok: false, error: "invalid-payload" });
      return;
    }

    if (message.type === "state" && role === "pet") {
      this.broadcast("dashboard", message);
      return;
    }
    if (message.type === "request_state" && role === "dashboard") {
      this.broadcast("pet", message);
      return;
    }
    if (message.type === "command" && role === "dashboard") {
      this.broadcast("pet", message);
      return;
    }

    this.send(sender, { type: "ack", ok: false, error: "unsupported-message" });
  }

  broadcast(targetRole, payload) {
    const text = JSON.stringify(payload);
    for (const [socket, role] of this.peers.entries()) {
      if (role !== targetRole) {
        continue;
      }
      try {
        socket.send(text);
      } catch (_error) {}
    }
  }

  send(socket, payload) {
    try {
      socket.send(JSON.stringify(payload));
    } catch (_error) {}
  }
}
