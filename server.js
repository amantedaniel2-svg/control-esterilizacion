const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

const supabase = createClient(
  "https://xvzqypytfxvroedqxfbw.supabase.co",
  "sb_publishable_4ElkPdrxsNCeMVTi7woAIA_DEbbi4LX"
);

// FUNCION PARA SUBIR FOTO
async function subirFoto(file) {
  if (!file) return null;

  const fileName = Date.now() + "-" + file.originalname;

  const { error } = await supabase.storage
    .from("fotos")
    .upload(fileName, fs.readFileSync(file.path), {
      contentType: file.mimetype
    });

  fs.unlinkSync(file.path); // 🔥 elimina archivo local

  if (error) {
    console.log("Error subiendo foto:", error);
    return null;
  }

  const { data } = supabase
    .storage
    .from("fotos")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// FRONT
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// OPA
app.post("/opa", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, ppm } = req.body;
    const estado = ppm >= 0.3 ? "ACEPTADO" : "RECHAZADO";

    const foto_url = await subirFoto(req.file);

    await supabase.from("registros").insert([
      { tecnico, tipo: "OPA", resultado: ppm, estado, foto_url }
    ]);

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send("Error OPA");
  }
});

// TEMPERATURA
app.post("/temperatura", async (req, res) => {
  try {
    const { tecnico, sector, resultado } = req.body;

    await supabase.from("registros").insert([
      { tecnico, tipo: "TEMPERATURA", resultado, sector }
    ]);

    res.redirect("/");
  } catch (error) {
    res.send("Error temperatura");
  }
});

// ATP (✔ ahora con foto)
app.post("/atp", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, resultado, ubicacion } = req.body;

    const foto_url = await subirFoto(req.file);

    await supabase.from("registros").insert([
      { tecnico, tipo: "ATP", resultado, ubicacion, foto_url }
    ]);

    res.redirect("/");
  } catch (error) {
    res.send("Error ATP");
  }
});

// DUREZA (✔ ahora con foto)
app.post("/dureza", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, cumple } = req.body;

    const foto_url = await subirFoto(req.file);

    await supabase.from("registros").insert([
      { tecnico, tipo: "DUREZA", cumple, foto_url }
    ]);

    res.redirect("/");
  } catch (error) {
    res.send("Error dureza");
  }
});

// EPP
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
  } catch (error) {
    res.send("Error EPP");
  }
});

// REPORTE
app.get("/reporte", async (req, res) => {
  try {
    const { data, error } = await supabase.from("registros").select("*");

    if (error) return res.send("Error en consulta");

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
          <td>${r.tecnico}</td>
          <td>${r.tipo}</td>
          <td>${r.resultado || r.cumple || ""}</td>
          <td>${r.estado || ""}</td>
          <td>${r.foto_url ? `<img src="${r.foto_url}" width="100">` : ""}</td>
          <td>${r.fecha}</td>
        </tr>
      `;
    });

    html += `</table>`;
    res.send(html);

  } catch (error) {
    res.send("Error obteniendo datos");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("App funcionando");
});
