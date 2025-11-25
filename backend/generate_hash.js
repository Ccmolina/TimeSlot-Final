import bcrypt from "bcryptjs";

const generate = async () => {
  const adminHash = await bcrypt.hash("admin123", 10);
  const medicoHash = await bcrypt.hash("medico123", 10);
  const pacienteHash = await bcrypt.hash("paciente123", 10);

  console.log({ adminHash, medicoHash, pacienteHash });
};

generate();
