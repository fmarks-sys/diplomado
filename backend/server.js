import 'dotenv/config'; //PRIMERO
import app from './app.js';
import { updateVencidos } from './modules/prestamos/prestamos.repository.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Registrar atrasos sin depender de que alguien consulte la API.
let revisandoAtrasos = false;
const revisarAtrasos = async () => {
  if (revisandoAtrasos) return;
  revisandoAtrasos = true;
  try { await updateVencidos(); }
  catch { console.error('No se pudieron actualizar las sanciones por atraso'); }
  finally { revisandoAtrasos = false; }
};
void revisarAtrasos();
setInterval(revisarAtrasos, 60_000).unref();
