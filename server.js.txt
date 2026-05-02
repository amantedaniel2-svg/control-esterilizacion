const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

// 🔐 PEGAR TUS DATOS DE SUPABASE ACÁ
const supabase = createClient(
https://xvzqypytfxvroedqxfbw.supabase.co/rest/v1/
  sb_publishable_4ElkPdrxsNCeMVTi7woAIA_DEbbi4LX
);

// FRONTEND
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= OPA =================
app.post("/opa", upload.single("foto"), async (req, res) => {
  const { tecnico, ppm } = req.body;

  const estado = ppm >= 0.3 ? "ACEPTADO" : "RECHAZADO";

  await supabase.from("registros").insert({
    tecnico,
    tipo: "OPA",
    resultado: ppm,
    estado,
    fecha: new Date()
  });

  res.redirect("/");
});

// ================= ATP =================
app.post("/atp", upload.single("foto"), async (req, res) => {
  const { tecnico, resultado, ubicacion } = req.body;

  await supabase.from("registros").insert({
    tecnico,
    tipo: "ATP",
    resultado,
    ubicacion,
    fecha: new Date()
  });

  res.redirect("/");
});

// ================= REPORTE =================
app.get("/reporte", async (req, res) => {
  const { data } = await supabase.from("registros").select("*");
  res.json(data);
});

app.listen(process.env.PORT || 3000);
