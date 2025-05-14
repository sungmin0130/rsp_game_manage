// Firebase 설정
const firebaseConfig = {
  apiKey: "",
  authDomain: "rsp-game-76111.firebaseapp.com",
  projectId: "rsp-game-76111"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 🔍 특정 학번 조회 (studentIdOnly 사용)
async function fetchStudentStats() {
  const search = document.getElementById("searchId").value.trim();
  const tbody = document.querySelector("#logTable tbody");
  const summary = document.getElementById("summary");
  tbody.innerHTML = "";
  summary.innerHTML = "";

  if (!search) return alert("학번을 입력하세요.");

  let totalGames = 0, wins = 0, draws = 0, losses = 0;
  let totalReward = 0, totalCharged = 0, totalUsed = 0, totalWithdrawn = 0;

  // 게임 로그 조회 (시간 내림차순)
  const gameSnapshot = await db.collection("gameLogs")
    .where("studentIdOnly", ">=", search)
    .where("studentIdOnly", "<=", search + "\uf8ff")
    .orderBy("studentIdOnly")
    .orderBy("time", "desc")
    .get();

  gameSnapshot.forEach(doc => {
    const d = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `<td>${new Date(d.time).toLocaleString()}</td>
                     <td>${d.type}</td>
                     <td>${d.result || d.reward || '-'}</td>`;
    tbody.appendChild(row);

    if (d.type === "게임결과") {
      totalGames++;
      if (d.result.includes("이겼")) wins++;
      else if (d.result.includes("무승부")) draws++;
      else losses++;
    }
    if (d.type === "보상") {
      totalReward += parseInt(d.reward?.replace("X", "")) || 0;
    }
    if (d.type === "게임시작") {
      totalUsed++;
    }
  });

  // 코인 로그 조회 (시간 내림차순)
  const coinSnapshot = await db.collection("coinLogs")
    .where("studentIdOnly", ">=", search)
    .where("studentIdOnly", "<=", search + "\uf8ff")
    .orderBy("studentIdOnly")
    .orderBy("time", "desc")
    .get();

  coinSnapshot.forEach(doc => {
    const d = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `<td>${new Date(d.time).toLocaleString()}</td>
                     <td>${d.type}</td>
                     <td>${d.amount || '-'}</td>`;
    tbody.appendChild(row);

    if (d.type === "충전") totalCharged += d.amount || 0;
    if (d.type === "출금") totalWithdrawn += d.amount || 0;
  });

  const winRate = totalGames ? ((wins / totalGames) * 100).toFixed(1) : "0.0";

  summary.innerHTML = `
    <p>총 게임: ${totalGames} | 승: ${wins} | 무: ${draws} | 패: ${losses}</p>
    <p>승률: ${winRate}%</p>
    <p>사용: ${totalUsed} | 보상: ${totalReward} | 충전: ${totalCharged} | 출금: ${totalWithdrawn}</p>
  `;
}

// 🏆 명예의 전당 카드 표시
function renderHallOfFame(top3) {
  const hof = document.getElementById("hallOfFame");
  hof.innerHTML = "";
  const crowns = ["👑 GOLD MVP", "🥈 SILVER", "🥉 BRONZE"];
  top3.forEach((u, i) => {
    const div = document.createElement("div");
    div.className = "hof-card";
    div.innerHTML = `
      <div class="crown">${crowns[i]}</div>
      <h3>${u.studentId}</h3>
      <p>MVP: ${u.mvpScore}</p>
      <p>승률: ${u.winRate}%</p>
      <p>보상: ${u.reward}, 충전: ${u.charge}, 출금: ${u.withdraw}</p>
    `;
    hof.appendChild(div);
  });
}

// 📊 전체 사용자 랭킹
async function generateRanking() {
  const start = document.getElementById("startDate").valueAsDate;
  const end = document.getElementById("endDate").valueAsDate;
  const sortBy = document.getElementById("sortBy").value;
  const tbody = document.querySelector("#rankingTable tbody");
  tbody.innerHTML = "";
  document.getElementById("hallOfFame").innerHTML = "";

  if (!start || !end) return alert("시작일과 종료일을 입력하세요.");
  end.setDate(end.getDate() + 1);

  const gameSnap = await db.collection("gameLogs")
    .where("time", ">=", start.toISOString())
    .where("time", "<", end.toISOString())
    .get();

  const coinSnap = await db.collection("coinLogs")
    .where("time", ">=", start.toISOString())
    .where("time", "<", end.toISOString())
    .get();

  const stats = {};

  gameSnap.forEach(doc => {
    const d = doc.data();
    const id = d.studentId;
    if (!stats[id]) stats[id] = { wins: 0, draws: 0, losses: 0, total: 0, reward: 0, charge: 0, withdraw: 0 };
    if (d.type === "게임결과") {
      stats[id].total++;
      if (d.result.includes("이겼")) stats[id].wins++;
      else if (d.result.includes("무승부")) stats[id].draws++;
      else stats[id].losses++;
    }
    if (d.type === "보상") {
      stats[id].reward += parseInt(d.reward?.replace("X", "")) || 0;
    }
  });

  coinSnap.forEach(doc => {
    const d = doc.data();
    const id = d.studentId;
    if (!stats[id]) stats[id] = { wins: 0, draws: 0, losses: 0, total: 0, reward: 0, charge: 0, withdraw: 0 };
    if (d.type === "충전") stats[id].charge += d.amount || 0;
    if (d.type === "출금") stats[id].withdraw += d.amount || 0;
  });

  const list = Object.entries(stats).map(([id, s]) => {
    const winRate = s.total > 0 ? (s.wins / s.total) * 100 : 0;
    const mvpScore = (winRate * 0.4) + (s.reward * 0.3) + (s.total * 0.2) - (s.charge * 0.1);
    return {
      studentId: id,
      ...s,
      winRate: winRate.toFixed(1),
      mvpScore: mvpScore.toFixed(2)
    };
  });

  list.sort((a, b) => b[sortBy] - a[sortBy]);

  list.forEach((u, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.classList.add("mvp-gold");
    else if (i === 1) tr.classList.add("mvp-silver");
    else if (i === 2) tr.classList.add("mvp-bronze");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${u.studentId}</td>
      <td>${u.total}</td>
      <td>${u.wins}</td>
      <td>${u.draws}</td>
      <td>${u.losses}</td>
      <td>${u.winRate}</td>
      <td>${u.charge}</td>
      <td>${u.reward}</td>
      <td>${u.withdraw}</td>
      <td>${u.mvpScore}</td>
    `;
    tbody.appendChild(tr);
  });

  renderHallOfFame(list.slice(0, 3));
  window.rankingData = list;
}

// ⬇ 엑셀 다운로드
function downloadRanking() {
  if (!window.rankingData || window.rankingData.length === 0) {
    return alert("먼저 랭킹을 생성하세요.");
  }

  const sheet = window.rankingData.map((u, i) => ({
    순위: i + 1,
    학번: u.studentId,
    총게임: u.total,
    승: u.wins,
    무: u.draws,
    패: u.losses,
    승률: u.winRate + "%",
    충전: u.charge,
    보상: u.reward,
    출금: u.withdraw,
    MVP점수: u.mvpScore
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheet);
  XLSX.utils.book_append_sheet(wb, ws, "랭킹");
  XLSX.writeFile(wb, "사용자_랭킹.xlsx");
}

// ⏱️ 자동 갱신 (1분마다)
setInterval(() => {
  if (document.getElementById("startDate").value && document.getElementById("endDate").value) {
    generateRanking();
  }
}, 60000);
