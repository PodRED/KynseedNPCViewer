let itemMap = {};

async function loadItemList() {
  const res = await fetch("EAItems.txt");
  const text = await res.text();
  text.split("\n").forEach(line => {
    const parts = line.trim().split("|");
    if (!parts[0] || isNaN(parts[0])) return;
    itemMap[parseInt(parts[0])] = parts[1] || parts[0];
  });
}

document.getElementById("upload").addEventListener("change", async function() {
  await loadItemList();

  const file = this.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const xml = new DOMParser().parseFromString(e.target.result, "text/xml");
    processSave(xml);
  };

  reader.readAsText(file);
});

function processSave(xml) {
  const npcs = [...xml.getElementsByTagName("GenerationsSimData")];

  // Obtain current year
  const curYear = parseInt(xml.getElementsByTagName("CurrentYear")[0].textContent);

  let data = npcs
    .filter(n => n.getElementsByTagName("IsDead")[0]?.textContent !== "true")
    .map(npc => extractNPC(npc, curYear));

  buildTable(data);
}

function extractNPC(npc, curYear) {
  const get = tag => npc.getElementsByTagName(tag)[0]?.textContent || null;

  // Birth
  const bd = npc.getElementsByTagName("Birthdate")[0];
  const byear = bd ? parseInt(bd.getElementsByTagName("year")[0].textContent) : null;
  const bseason = bd ? parseInt(bd.getElementsByTagName("season")[0].textContent) : null;
  const bday = bd ? parseInt(bd.getElementsByTagName("day")[0].textContent) : null;

  // Death
  const dd = npc.getElementsByTagName("DeathDate")[0];
  const dy = dd ? parseInt(dd.getElementsByTagName("year")[0].textContent) : null;
  const ds = dd ? parseInt(dd.getElementsByTagName("season")[0].textContent) : null;
  const dday = dd ? parseInt(dd.getElementsByTagName("day")[0].textContent) : null;

  const age = byear != null ? curYear - byear : null;
  const deathAge = dy != null ? dy - byear : null;

  // Likes
  let likes = [...npc.getElementsByTagName("Likes")[0]?.getElementsByTagName("int") || []]
    .map(x => itemMap[parseInt(x.textContent)] || x.textContent);

  // Dislikes
  let hates = [...npc.getElementsByTagName("Hates")[0]?.getElementsByTagName("int") || []]
    .map(x => itemMap[parseInt(x.textContent)] || x.textContent);

  return {
    ID: parseInt(get("ID")),
    FirstName: get("FirstName"),
    FamilyName: get("FamilyName"),
    Gender: get("Gender"),
    BirthSeason: bseason,
    BirthDay: bday,
    Age: age,
    DeathAge: deathAge,
    LikedItems: likes.join(", "),
    DislikedItems: hates.join(", "),
    DeathYear: dy,
    DeathSeason: ds,
    DeathDay: dday
  };
}

function buildTable(data) {
  const table = document.getElementById("npcTable");
  const headerRow = document.getElementById("headerRow");
  const body = document.getElementById("tableBody");

  table.style.display = "table";
  headerRow.innerHTML = "";
  body.innerHTML = "";

  const columns = Object.keys(data[0]);

  // Headers
  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    th.onclick = () => sortBy(data, col);
    headerRow.appendChild(th);
  });

  // Rows
  data.forEach(npc => addRow(body, npc, columns));
}

function addRow(body, npc, columns) {
  const tr = document.createElement("tr");
  columns.forEach(col => {
    const td = document.createElement("td");
    td.textContent = npc[col] ?? "";
    tr.appendChild(td);
  });
  body.appendChild(tr);
}

function sortBy(data, key) {
  data.sort((a, b) => (a[key] > b[key] ? 1 : -1));
  buildTable(data);
}
