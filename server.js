const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 📁 asegurar carpeta uploads
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const upload = multer({ dest: "uploads/" });

// 🔐 SUPABASE
const supabase = createClient(
  "https://xvzqypytfxvroedqxfbw.supabase.co",
  "sb_publishable_4ElkPdrxsNCeMVTi7woAIA_DEbbi4LX"
);

// ============================
// FUNCION SUBIR FOTO
// ============================
async function subirFoto(file) {
  if (!file) return null;

  try {
    const fileName = Date.now() + "-" + file.originalname;

    const fileBuffer = fs.readFileSync(file.path);

    const { error } = await supabase.storage
      .from("fotos")
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype
      });

    fs.unlinkSync(file.path); // eliminar archivo local

    if (error) {
      console.log("ERROR STORAGE:", error);
      return null;
    }

    const { data } = supabase
      .storage
      .from("fotos")
      .getPublicUrl(fileName);

    return data.publicUrl;

  } catch (err) {
    console.log("ERROR SUBIENDO FOTO:", err);
    return null;
  }
}

// ============================
// FRONT
// ============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ============================
// TEST (para verificar rutas)
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

    if (error) console.log("ERROR OPA:", error);

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send("Error OPA");
  }
});

// ============================
// TEMPERATURA
// ============================
app.post("/temperatura", async (req, res) => {
  try {
    const { tecnico, sector, resultado } = req.body;

    const { error } = await supabase.from("registros").insert([
      { tecnico, tipo: "TEMPERATURA", resultado, sector }
    ]);

    if (error) console.log("ERROR TEMP:", error);

    res.redirect("/");
  } catch (error) {
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

    const { error } = await supabase.from("registros").insert([
      { tecnico, tipo: "ATP", resultado, ubicacion, foto_url }
    ]);

    if (error) console.log("ERROR ATP:", error);

    res.redirect("/");
  } catch (error) {
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

    const { error } = await supabase.from("registros").insert([
      { tecnico, tipo: "DUREZA", cumple, foto_url }
    ]);

    if (error) console.log("ERROR DUREZA:", error);

    res.redirect("/");
  } catch (error) {
    res.send("Error dureza");
  }
});

// ============================
// EPP
// ============================
app.post("/epp", async (req, res) => {
  try {
    const { tecnico, cofia, guantes, antiparras, delantal, botas } = req.body;

    const { error } = await supabase.from("registros").insert([
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

    if (error) console.log("ERROR EPP:", error);

    res.redirect("/");
  } catch (error) {
    res.send("Error EPP");
  }
});

// ============================
// REPORTE (FINAL)
// ============================
app.get("/reporte", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("registros")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log("ERROR SUPABASE:", error);
      return res.send("Error en base de datos");
    }

    if (!data || data.length === 0) {
      return res.send("<h2>No hay registros cargados</h2>");
    }

    let html = `
      <h1>Reporte de Registros</h1>
      <table border="1" cellpadding="5">
        <tr>
          <th>ID</th>
          <th>Técnico</th>
          <th>Tipo</th>
          <th>Resultado</th>
          <th>Estado</th>
          <th>Foto</th>
          <th>Fecha</th>
        </tr>
    `;

    data.forEach(r => {
      html += `
        <tr>
          <td>${r.id}</td>
          <td>${r.tecnico || ""}</td>
          <td>${r.tipo || ""}</td>
          <td>${r.resultado || r.cumple || ""}</td>
          <td>${r.estado || ""}</td>
          <td>
            ${
              r.foto_url
                ? `<img src="${r.foto_url}" width="100">`
                : "Sin foto"
            }
          </td>
          <td>${r.fecha || ""}</td>
        </tr>
      `;
    });

    html += `</table>`;
    res.send(html);

  } catch (error) {
    console.log("ERROR GENERAL:", error);
    res.send("Error en servidor");
  }
});

// ============================
app.listen(process.env.PORT || 3000, () => {
  console.log("App funcionando");
});
