// Connecte automatiquement au bon backend (local ou Render)
const socket = io(
    window.location.hostname.includes("localhost")
      ? "http://localhost:3000"
      : "https://kculture-backend.onrender.com"
  );
  
  let currentRoom = null;
  
  // Création d'une partie
  function createRoom() {
    const pseudo = document.getElementById("pseudo").value;
    if (!pseudo) return alert("Entrez un pseudo !");
    socket.emit("create_room", pseudo);
  }
  
  // Rejoindre une partie existante
  function joinRoom() {
    const pseudo = document.getElementById("pseudo").value;
    const roomId = document.getElementById("roomToJoin").value;
    if (!pseudo || !roomId) return alert("Pseudo et code requis !");
    currentRoom = roomId;
    socket.emit("join_room", { roomId, pseudo });
    socket.emit("start_game", roomId);
  }
  
  // Quand une room est créée
  socket.on("room_created", (roomId) => {
    currentRoom = roomId;
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    socket.emit("start_game", roomId);
  });
  
  // Affichage d'une nouvelle question
  socket.on("new_question", (q) => {
    document.getElementById("question").innerText = q.question;
  
    const choicesDiv = document.getElementById("choices");
    const input = document.getElementById("textAnswer");
    choicesDiv.innerHTML = "";
    input.value = "";
    input.classList.add("hidden");
  
    if (q.type === "qcm") {
      q.choices.forEach((c) => {
        const btn = document.createElement("button");
        btn.textContent = c;
        btn.onclick = () => submitAnswer(c);
        choicesDiv.appendChild(btn);
      });
    } else if (q.type === "text") {
      input.classList.remove("hidden");
    }
  });
  
  // Envoi de la réponse
  function submitAnswer(choice) {
    const input = document.getElementById("textAnswer");
    const answer = choice || input.value;
    if (!answer) return alert("Réponse vide !");
    socket.emit("submit_answer", { roomId: currentRoom, answer });
    input.value = "";
  }
  
  // Résultat individuel (optionnel à améliorer)
  socket.on("answer_result", (data) => {
    if (data.correct) {
      console.log("Bonne réponse !");
    } else {
      console.log("Mauvaise réponse !");
    }
  });
  
  // Affichage des scores à la fin
  socket.on("game_over", (players) => {
    document.getElementById("game").classList.add("hidden");
    const scoreboard = document.getElementById("scoreboard");
    const list = document.getElementById("scores");
  
    list.innerHTML = "";
    players
      .sort((a, b) => b.score - a.score)
      .forEach((p) => {
        const li = document.createElement("li");
        li.textContent = `${p.pseudo} : ${p.score} point${p.score > 1 ? "s" : ""}`;
        list.appendChild(li);
      });
  
    scoreboard.classList.remove("hidden");
  });
  