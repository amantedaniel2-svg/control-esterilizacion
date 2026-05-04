const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

// 🔐 PONÉ TUS DATOS REALES
const supabase = createClient(
  "https://xvzqypytfxvroedqxfbw.supabase.co",
  "sb_publishable_4ElkPdrxsNCeMVTi7woAIA_DEbbi4LX"
);

// FRONTEND
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// OPA
app.post("/opa", upload.single("foto"), async (req, res) => {
  try {
    const { tecnico, ppm } = req.body;

    const estado = ppm >= 0.3 ? "ACEPTADO" : "RECHAZADO";

    await supabase.from("registros").insert({
      tecnico,
      tipo: "OPA",
      resultado: ppm,
      estado
    });

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send("Error guardando datos");
  }
});

// REPORTE
app.get("/reporte", async (req, res) => {
  try {
    const { data } = await supabase.from("registros").select("*");
    res.json(data);
  } catch (error) {
    res.send("Error obteniendo datos");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("App funcionando");
});
