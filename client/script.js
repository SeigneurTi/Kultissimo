// Kultissimo : script.js avec lobby, timing, anecdote
const socket = io(
    window.location.hostname.includes("localhost")
      ? "http://localhost:3000"
      : "https://kultissimo-backend.onrender.com"
  );
  
  let currentRoom = null;
  let currentPlayerId = null;
  let questionTimeout = null;
  let isOwner = false;
  
  function createRoom() {
    const pseudo = document.getElementById("pseudo").value;
    if (!pseudo) return alert("Entrez un pseudo !");
    socket.emit("create_room", pseudo);
  }
  
  function goToJoinLobby() {
    const code = document.getElementById("roomToJoin").value;
    if (!code) return alert("Entrez un code de partie !");
    currentRoom = code;
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("joinLobby").classList.remove("hidden");
  }
  
  function joinRoom() {
    const pseudo = document.getElementById("pseudoJoin").value;
    if (!pseudo) return alert("Entrez un pseudo !");
    socket.emit("join_room", { roomId: currentRoom, pseudo });
    document.getElementById("joinLobby").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");
  }
  
  function startGame() {
    socket.emit("start_game", currentRoom);
    document.getElementById("startGameBtn").disabled = true;
  }
  
  socket.on("room_created", (roomId) => {
    currentRoom = roomId;
    isOwner = true;
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");
    document.getElementById("lobbyCode").innerText = roomId;
  });
  
  socket.on("player_list", (players) => {
    const list = document.getElementById("playerList");
    list.innerHTML = "";
    players.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p.pseudo;
      list.appendChild(li);
    });
  });
  
  socket.on("new_question", (q) => {
    clearTimeout(questionTimeout);
    document.getElementById("lobby").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    document.getElementById("anecdote").classList.add("hidden");
  
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
    } else {
      input.classList.remove("hidden");
    }
  
    let timeLeft = 10;
    const timer = document.getElementById("timer");
    timer.innerText = `⏳ ${timeLeft} secondes`;
    questionTimeout = setInterval(() => {
      timeLeft--;
      timer.innerText = `⏳ ${timeLeft} secondes`;
      if (timeLeft <= 0) {
        clearInterval(questionTimeout);
        submitAnswer("__timeout__");
      }
    }, 1000);
  });
  
  function submitAnswer(choice) {
    clearInterval(questionTimeout);
    const input = document.getElementById("textAnswer");
    const answer = choice !== "__timeout__" ? (choice || input.value) : "";
    socket.emit("submit_answer", { roomId: currentRoom, answer });
    input.value = "";
    document.getElementById("choices").innerHTML = "";
    input.classList.add("hidden");
  }
  
  socket.on("answer_result", ({ correct, anecdote }) => {
    document.getElementById("anecdote").textContent = `📘 ${anecdote}`;
    document.getElementById("anecdote").classList.remove("hidden");
    let counter = 5;
    const timer = document.getElementById("timer");
    timer.innerText = `📚 Anecdote pendant ${counter} sec...`;
    const countdown = setInterval(() => {
      counter--;
      timer.innerText = `📚 Anecdote pendant ${counter} sec...`;
      if (counter <= 0) {
        clearInterval(countdown);
        document.getElementById("anecdote").classList.add("hidden");
      }
    }, 1000);
  });
  
  socket.on("game_over", (players) => {
    document.getElementById("game").classList.add("hidden");
    const scoreboard = document.getElementById("scoreboard");
    const list = document.getElementById("scores");
    list.innerHTML = "";
    players.sort((a, b) => b.score - a.score).forEach((p) => {
      const li = document.createElement("li");
      li.textContent = `${p.pseudo} : ${p.score} point${p.score > 1 ? "s" : ""}`;
      list.appendChild(li);
    });
    scoreboard.classList.remove("hidden");
  });
  