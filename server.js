const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ============================
// CONFIG LOGIN
// ============================
const USER = "admin";
const PASS = "1234";

// ============================
// CREAR CARPETA uploads
// ============================
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const upload = multer({ dest: "uploads/" });

// ============================
// SUPABASE
// ============================
const supabase = createClient(
  "https://xvzqypytfxvroedqxfbw.supabase.co",
  "sb_publishable_4ElkPdrxsNCeMVTi7woAIA_DEbbi4LX"
);

// ============================
// SUBIR FOTO
// ============================
async function subirFoto(file) {
  if (!file) return null;

  try {
    const fileName = Date.now() + "-" + file.originalname;
    const buffer = fs.readFileSync(file.path);

    const { error } = await supabase.storage
      .from("fotos")
      .upload(fileName, buffer, {
        contentType: file.mimetype
      });

    fs.unlinkSync(file.path);

    if (error) {
      console.log("ERROR STORAGE:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("fotos")
      .getPublicUrl(fileName);

    return data.publicUrl;

  } catch (err) {
    console.log("ERROR FOTO:", err);
    return null;
  }
}

// ============================
// LOGIN
// ============================
app.get("/login", (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="POST">
      Usuario: <input name="user"><br>
      Password: <input type="password" name="pass"><br>
      <button>Entrar</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === USER && pass === PASS) {
    res.redirect("/");
  } else {
    res.send("Login incorrecto");
  }
});

// ============================
// FRONT
// ============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ============================
// TEST
// ============================
app.get("/test", (req, res) => {
  res.send("FUNCIONA OK");
});

// ============================
// OPA
// ============================
app.post("/opa", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, ppm } = req.body;
    const estado = Number(ppm) >= 0.3 ? "ACEPTADO" : "RECHAZADO";

    const foto_url = await subirFoto(req.file);

    const { error } = await supabase.from("registros").insert([
      { tecnico, tipo: "OPA", resultado: ppm, estado, foto_url }
    ]);

    if (error) console.log(error);

    res.redirect("/");
  } catch {
    res.send("Error OPA");
  }
});

// ============================
// TEMPERATURA
// ============================
app.post("/temperatura", async (req, res) => {
  try {
    const { tecnico, sector, resultado } = req.body;

    await supabase.from("registros").insert([
      { tecnico, tipo: "TEMPERATURA", resultado, sector }
    ]);

    res.redirect("/");
  } catch {
    res.send("Error temperatura");
  }
});

// ============================
// ATP
// ============================
app.post("/atp", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, resultado, ubicacion } = req.body;

    const foto_url = await subirFoto(req.file);

    await supabase.from("registros").insert([
      { tecnico, tipo: "ATP", resultado, ubicacion, foto_url }
    ]);

    res.redirect("/");
  } catch {
    res.send("Error ATP");
  }
});

// ============================
// DUREZA
// ============================
app.post("/dureza", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, cumple } = req.body;

    const foto_url = await subirFoto(req.file);

    await supabase.from("registros").insert([
      { tecnico, tipo: "DUREZA", cumple, foto_url }
    ]);

    res.redirect("/");
  } catch {
    res.send("Error dureza");
  }
});

// ============================
// EPP
// ============================
app.post("/epp", async (req, res) => {
  try {
    const { tecnico, cofia, guantes, antiparras, delantal, botas } = req.body;

    await supabase.from("registros").insert([
      {
        tecnico,
        tipo: "EPP",
        observaciones: JSON.stringify({
          cofia: !!cofia,
          guantes: !!guantes,
          antiparras: !!antiparras,
          delantal: !!delantal,
          botas: !!botas
        })
      }
    ]);

    res.redirect("/");
  } catch {
    res.send("Error EPP");
  }
});

// ============================
// DASHBOARD
// ============================
app.get("/dashboard", async (req, res) => {
  const { data } = await supabase.from("registros").select("*");

  const total = data.length;

  const contar = tipo => data.filter(r => r.tipo === tipo).length;

  res.send(`
    <h1>📊 Dashboard</h1>
    <p>Total: ${total}</p>
    <p>OPA: ${contar("OPA")}</p>
    <p>ATP: ${contar("ATP")}</p>
    <p>TEMP: ${contar("TEMPERATURA")}</p>
    <p>DUREZA: ${contar("DUREZA")}</p>
    <p>EPP: ${contar("EPP")}</p>

    <br><a href="/">Inicio</a>
    <br><a href="/reporte">Reporte</a>
  `);
});

// ============================
// REPORTE CON FILTRO
// ============================
app.get("/reporte", async (req, res) => {
  let query = supabase.from("registros").select("*");

  if (req.query.tecnico)
    query = query.eq("tecnico", req.query.tecnico);

  if (req.query.tipo)
    query = query.eq("tipo", req.query.tipo);

  const { data } = await query.order("id", { ascending: false });

  let html = `
    <h1>Reporte</h1>

    <form>
      Técnico: <input name="tecnico">
      Tipo:
      <select name="tipo">
        <option value="">Todos</option>
        <option>OPA</option>
        <option>ATP</option>
        <option>TEMPERATURA</option>
        <option>DUREZA</option>
        <option>EPP</option>
      </select>
      <button>Filtrar</button>
    </form>

    <br>
    <a href="/excel">Excel</a> | 
    <a href="/dashboard">Dashboard</a>

    <table border="1">
  `;

  data.forEach(r => {
    html += `
      <tr>
        <td>${r.id}</td>
        <td>${r.tecnico}</td>
        <td>${r.tipo}</td>
        <td>${r.resultado || r.cumple || ""}</td>
        <td>${r.estado || ""}</td>
        <td>${r.foto_url ? `<img src="${r.foto_url}" width="80">` : ""}</td>
        <td>${r.fecha || ""}</td>
      </tr>
    `;
  });

  html += "</table>";

  res.send(html);
});

// ============================
// EXCEL (PRO)
// ============================
app.get("/excel", async (req, res) => {
  const { data } = await supabase
    .from("registros")
    .select("*")
    .order("id", { ascending: false });

  const json = data.map(r => ({
    ID: r.id,
    Tecnico: r.tecnico,
    Tipo: r.tipo,
    Resultado: r.resultado || r.cumple || "",
    Estado: r.estado || "",
    Fecha: r.fecha
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(json);
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", "attachment; filename=reporte.xlsx");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.send(buffer);
});

// ============================
app.listen(process.env.PORT || 3000, () => {
  console.log("App funcionando 🚀");
});
