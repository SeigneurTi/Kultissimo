const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const questions = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../questions/questions.json"))
);

let rooms = {}; // Stockage en mémoire des parties

app.use(express.static(path.join(__dirname, "../client")));

io.on("connection", (socket) => {
  console.log("✅ Un joueur est connecté :", socket.id);

  // Création d'une partie
  socket.on("create_room", (pseudo) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    socket.join(roomId);
    rooms[roomId] = {
      players: [{ id: socket.id, pseudo, score: 0 }],
      currentQuestion: 0,
      usedQuestions: []
    };
    socket.emit("room_created", roomId);
  });

  // Rejoindre une partie
  socket.on("join_room", ({ roomId, pseudo }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error", "Room not found");
    socket.join(roomId);
    room.players.push({ id: socket.id, pseudo, score: 0 });
    io.to(roomId).emit("player_list", room.players);
  });

  // Démarrage de la partie
  socket.on("start_game", (roomId) => {
    sendQuestion(roomId);
  });

  // Réception de réponse
  socket.on("submit_answer", ({ roomId, answer }) => {
    const room = rooms[roomId];
    if (!room || !room.currentQuestionObj) return;

    const question = room.currentQuestionObj;
    const player = room.players.find((p) => p.id === socket.id);

    const correct =
      (question.type === "qcm" && answer === question.answer) ||
      (question.type === "text" &&
        answer.trim().toLowerCase() === question.answer.trim().toLowerCase());

    if (correct) player.score++;

    socket.emit("answer_result", { correct });

    // Avancer à la question suivante
    room.currentQuestion++;
    if (room.currentQuestion < 10) {
      sendQuestion(roomId);
    } else {
      io.to(roomId).emit("game_over", room.players);
    }
  });
});

// Envoi de la prochaine question
function sendQuestion(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const available = questions.questions.filter(
    (q) => !room.usedQuestions.includes(q.question)
  );
  const next = available[Math.floor(Math.random() * available.length)];

  room.currentQuestionObj = next;
  room.usedQuestions.push(next.question);

  io.to(roomId).emit("new_question", next);
}

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Serveur Kultissimo en ligne sur le port ${PORT}`)
);
