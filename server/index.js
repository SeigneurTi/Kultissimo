const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app); // <== C'EST CE QUI MANQUAIT
const io = new Server(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
