import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, '..', 'public', 'resultats_simplified');

// Lire tous les fichiers JSON du répertoire
const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));

console.log(`Ajout des IDs d'erreur à ${files.length} fichiers...`);

let processedCount = 0;
let errorCount = 0;

files.forEach(file => {
  try {
    const filePath = path.join(targetDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Ajouter les IDs aux erreurs du critère 4
    if (data.result.erreursCritere4) {
      data.result.erreursCritere4 = data.result.erreursCritere4.map((erreur, index) => ({
        id: `erreur4.${index + 1}`,
        ...erreur
      }));
    }

    // Ajouter les IDs aux erreurs du critère 5
    if (data.result.erreursCritere5) {
      data.result.erreursCritere5 = data.result.erreursCritere5.map((erreur, index) => ({
        id: `erreur5.${index + 1}`,
        ...erreur
      }));
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    processedCount++;

  } catch (err) {
    console.error(`Erreur lors du traitement de ${file}:`, err.message);
    errorCount++;
  }
});

console.log(`\nTerminé!`);
console.log(`- Fichiers mis à jour: ${processedCount}`);
console.log(`- Erreurs: ${errorCount}`);
