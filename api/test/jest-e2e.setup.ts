import * as path from "path";
import * as dotenv from "dotenv";

// Carga explícita del .env.test (evita depender del entorno del sistema/CI)
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
