const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

let registros = [];

// FRONTEND
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// OPA
app.post("/opa", upload.single("foto"), (req, res) => {
  const { tecnico, ppm } = req.body;

  const estado = ppm >= 0.3 ? "ACEPTADO" : "RECHAZADO";

  registros.push({
    tecnico,
    tipo: "OPA",
    resultado: ppm,
    estado
  });

  res.redirect("/");
});

// REPORTE
app.get("/reporte", (req, res) => {
  res.json(registros);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("App funcionando");
});
