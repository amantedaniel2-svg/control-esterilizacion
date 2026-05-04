const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

const supabase = createClient(
  "https://xvzqypytfxvroedqxfbw.supabase.co",
  "sb_publishable_4ElkPdrxsNCeMVTi7woAIA_DEbbi4LX"
);

// FRONT
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// OPA
app.post("/opa", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, ppm } = req.body;
    const estado = ppm >= 0.3 ? "ACEPTADO" : "RECHAZADO";

    let foto_url = null;

    if (req.file) {
      const fileName = Date.now() + "-" + req.file.originalname;

      const { data, error } = await supabase.storage
        .from("fotos")
        .upload(fileName, require("fs").readFileSync(req.file.path), {
          contentType: req.file.mimetype
        });

      if (!error) {
        const { data: publicUrl } = supabase
          .storage
          .from("fotos")
          .getPublicUrl(fileName);

        foto_url = publicUrl.publicUrl;
      }
    }

    await supabase.from("registros").insert([
      {
        tecnico,
        tipo: "OPA",
        resultado: ppm,
        estado,
        foto_url
      }
    ]);

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send("Error guardando datos");
  }
});

// TEMPERATURA
app.post("/temperatura", async (req, res) => {
  const { tecnico, sector, resultado } = req.body;

  await supabase.from("registros").insert([
    {
      tecnico,
      tipo: "TEMPERATURA",
      resultado,
      sector
    }
  ]);

  res.redirect("/");
});

// ATP
app.post("/atp", upload.single("foto"), async (req, res) => {
  const { tecnico, resultado, ubicacion } = req.body;

  await supabase.from("registros").insert([
    {
      tecnico,
      tipo: "ATP",
      resultado,
      ubicacion
    }
  ]);

  res.redirect("/");
});

// DUREZA
app.post("/dureza", upload.single("foto"), async (req, res) => {
  const { tecnico, cumple } = req.body;

  await supabase.from("registros").insert([
    {
      tecnico,
      tipo: "DUREZA",
      cumple
    }
  ]);

  res.redirect("/");
});

// EPP
app.post("/epp", async (req, res) => {
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
});

// REPORTE
app.get("/reporte", async (req, res) => {
  try {
    const { data, error } = await supabase.from("registros").select("*");

    if (error) {
      return res.send("Error en consulta");
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
          <th>Fecha</th>
        </tr>
    `;

    data.forEach(r => {
      html += `
        <tr>
          <td>${r.id}</td>
          <td>${r.tecnico}</td>
          <td>${r.tipo}</td>
          <td>${r.resultado}</td>
          <td>${r.estado || ""}</td>
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
