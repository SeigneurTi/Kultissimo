// server/index.js - Kultissimo backend complet avec lobby, timer, anecdote
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

let rooms = {};

app.use(express.static(path.join(__dirname, "../client")));

io.on("connection", (socket) => {
  console.log("✅ Un joueur est connecté:", socket.id);

  socket.on("create_room", (pseudo) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    socket.join(roomId);
    rooms[roomId] = {
      ownerId: socket.id,
      players: [{ id: socket.id, pseudo, score: 0, hasAnswered: false }],
      currentQuestion: 0,
      usedQuestions: [],
      currentQuestionObj: null,
      timeoutId: null
    };
    socket.emit("room_created", roomId);
    io.to(roomId).emit("player_list", rooms[roomId].players);
  });

  socket.on("join_room", ({ roomId, pseudo }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error", "Room not found");
    socket.join(roomId);
    room.players.push({ id: socket.id, pseudo, score: 0, hasAnswered: false });
    io.to(roomId).emit("player_list", room.players);
  });

  socket.on("start_game", (roomId) => {
    const room = rooms[roomId];
    if (!room || socket.id !== room.ownerId) return;
    sendQuestion(roomId);
  });

  socket.on("submit_answer", ({ roomId, answer }) => {
    const room = rooms[roomId];
    if (!room || !room.currentQuestionObj) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.hasAnswered) return;
    player.hasAnswered = true;

    const question = room.currentQuestionObj;
    const correct =
      (question.type === "qcm" && answer === question.answer) ||
      (question.type === "text" && answer.trim().toLowerCase() === question.answer.trim().toLowerCase());

    if (correct) player.score++;

    socket.emit("answer_result", {
      correct,
      anecdote: question.anecdote || "Pas d'anecdote disponible."
    });

    // Si tous les joueurs ont répondu
    if (room.players.every(p => p.hasAnswered)) {
      clearTimeout(room.timeoutId);
      proceedToNext(roomId);
    }
  });
});

function sendQuestion(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const available = questions.questions.filter(
    q => !room.usedQuestions.includes(q.question)
  );
  const next = available[Math.floor(Math.random() * available.length)];

  room.currentQuestionObj = next;
  room.usedQuestions.push(next.question);
  room.players.forEach(p => p.hasAnswered = false);

  io.to(roomId).emit("new_question", next);

  room.timeoutId = setTimeout(() => {
    proceedToNext(roomId);
  }, 10000); // 10 sec
}

function proceedToNext(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  // Envoyer une dernière fois les anecdotes à ceux qui n'ont pas répondu
  room.players.forEach(p => {
    if (!p.hasAnswered) {
      io.to(p.id).emit("answer_result", {
        correct: false,
        anecdote: room.currentQuestionObj.anecdote || "Pas d'anecdote disponible."
      });
    }
  });

  setTimeout(() => {
    room.currentQuestion++;
    if (room.currentQuestion < 10) {
      sendQuestion(roomId);
    } else {
      io.to(roomId).emit("game_over", room.players);
      delete rooms[roomId];
    }
  }, 5000); // 5 sec d'anecdote
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Kultissimo en ligne sur le port ${PORT}`)
);