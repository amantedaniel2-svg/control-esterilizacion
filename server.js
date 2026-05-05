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
// SUBIR FOTO
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

    if (!tecnico || !ppm) return res.send("Faltan datos");

    const estado = Number(ppm) >= 0.3 ? "ACEPTADO" : "RECHAZADO";
    const foto_url = await subirFoto(req.file);

    const { error } = await supabase.from("registros").insert([{
      tecnico,
      tipo: "OPA",
      resultado: ppm,
      estado,
      foto_url,
      fecha: new Date().toISOString()
    }]);

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

    if (!tecnico || !sector || !resultado)
      return res.send("Faltan datos");

    const { error } = await supabase.from("registros").insert([{
      tecnico,
      tipo: "TEMPERATURA",
      resultado,
      sector,
      fecha: new Date().toISOString()
    }]);

    if (error) console.log("ERROR TEMP:", error);

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

    if (!tecnico || !resultado)
      return res.send("Faltan datos");

    const foto_url = await subirFoto(req.file);

    const { error } = await supabase.from("registros").insert([{
      tecnico,
      tipo: "ATP",
      resultado,
      ubicacion,
      foto_url,
      fecha: new Date().toISOString()
    }]);

    if (error) console.log("ERROR ATP:", error);

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

    if (!tecnico || !cumple)
      return res.send("Faltan datos");

    const foto_url = await subirFoto(req.file);

    const { error } = await supabase.from("registros").insert([{
      tecnico,
      tipo: "DUREZA",
      cumple,
      foto_url,
      fecha: new Date().toISOString()
    }]);

    if (error) console.log("ERROR DUREZA:", error);

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

    const { error } = await supabase.from("registros").insert([{
      tecnico,
      tipo: "EPP",
      observaciones: JSON.stringify({
        cofia: !!cofia,
        guantes: !!guantes,
        antiparras: !!antiparras,
        delantal: !!delantal,
        botas: !!botas
      }),
      fecha: new Date().toISOString()
    }]);

    if (error) console.log("ERROR EPP:", error);

    res.redirect("/");
  } catch {
    res.send("Error EPP");
  }
});

// ============================
// REPORTE CON FILTROS
// ============================
app.get("/reporte", async (req, res) => {
  try {
    const { tipo, tecnico } = req.query;

    let query = supabase
      .from("registros")
      .select("*")
      .order("id", { ascending: false });

    if (tipo) query = query.eq("tipo", tipo);
    if (tecnico) query = query.eq("tecnico", tecnico);

    const { data, error } = await query;

    if (error) return res.send("Error en base de datos");

    let html = `
      <h1>Reporte</h1>

      <form method="GET" action="/reporte">
        Tipo:
        <select name="tipo">
          <option value="">TODOS</option>
          <option>OPA</option>
          <option>ATP</option>
          <option>TEMPERATURA</option>
          <option>DUREZA</option>
          <option>EPP</option>
        </select>

        Técnico:
        <input name="tecnico">

        <button type="submit">Filtrar</button>
      </form>

      <br>
      <a href="/excel?tipo=${tipo || ""}&tecnico=${tecnico || ""}">📥 Excel</a>

      <table border="1">
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
                ? `<a href="${r.foto_url}" target="_blank">
                     <img src="${r.foto_url}" width="80">
                   </a>`
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
    console.log(error);
    res.send("Error servidor");
  }
});

// ============================
// EXCEL CON FILTROS
// ============================
app.get("/excel", async (req, res) => {
  try {
    const { tipo, tecnico } = req.query;

    let query = supabase.from("registros").select("*");

    if (tipo) query = query.eq("tipo", tipo);
    if (tecnico) query = query.eq("tecnico", tecnico);

    const { data, error } = await query;

    if (error) return res.send("Error datos");

    const datosExcel = data.map(r => ({
      ID: r.id,
      Tecnico: r.tecnico,
      Tipo: r.tipo,
      Resultado: r.resultado || r.cumple || "",
      Estado: r.estado || "",
      Fecha: r.fecha
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=reporte.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    res.send(buffer);

  } catch (error) {
    res.send("Error Excel");
  }
});

// ============================
app.listen(process.env.PORT || 3000, () => {
  console.log("App funcionando");
});

// ============================
// DASHBOARD
// ============================
app.get("/dashboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("registros")
      .select("*");

    if (error) return res.send("Error cargando dashboard");

    const total = data.length;

    const conteo = {
      OPA: data.filter(r => r.tipo === "OPA").length,
      ATP: data.filter(r => r.tipo === "ATP").length,
      TEMPERATURA: data.filter(r => r.tipo === "TEMPERATURA").length,
      DUREZA: data.filter(r => r.tipo === "DUREZA").length,
      EPP: data.filter(r => r.tipo === "EPP").length
    };

    let html = `
    <h1>📊 Dashboard</h1>

    <div style="display:flex;gap:20px;flex-wrap:wrap;">
      <div style="background:#1e3a5f;color:white;padding:20px;border-radius:10px;">Total: ${total}</div>
      <div style="background:#4caf50;color:white;padding:20px;border-radius:10px;">OPA: ${conteo.OPA}</div>
      <div style="background:#2196f3;color:white;padding:20px;border-radius:10px;">ATP: ${conteo.ATP}</div>
      <div style="background:#ff9800;color:white;padding:20px;border-radius:10px;">TEMP: ${conteo.TEMPERATURA}</div>
      <div style="background:#9c27b0;color:white;padding:20px;border-radius:10px;">DUREZA: ${conteo.DUREZA}</div>
      <div style="background:#607d8b;color:white;padding:20px;border-radius:10px;">EPP: ${conteo.EPP}</div>
    </div>

    <br><a href="/">⬅ Volver</a>
    <br><a href="/reporte">📋 Ver reporte</a>
    `;

    res.send(html);

  } catch (error) {
    res.send("Error dashboard");
  }
});
