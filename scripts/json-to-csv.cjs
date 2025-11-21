const fs = require('fs');
const path = require('path');

// Lire le fichier JSON
const jsonPath = path.join(__dirname, '../src/data/poems.json');
const poems = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Créer le CSV
const csvRows = [];

// Header
csvRows.push('id,title,author,collection,year,fullText,analyses');

// Données
poems.forEach(poem => {
  const row = [
    poem.id,
    `"${poem.title.replace(/"/g, '""')}"`,
    `"${poem.author.replace(/"/g, '""')}"`,
    `"${poem.collection.replace(/"/g, '""')}"`,
    poem.year,
    `"${poem.fullText.join('\n').replace(/"/g, '""')}"`,
    '""' // analyses vide par défaut
  ];
  csvRows.push(row.join(','));
});

// Écrire le fichier CSV
const csvPath = path.join(__dirname, '../src/data/poems.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');

console.log(`✅ CSV créé: ${csvPath}`);
console.log(`📊 ${poems.length} poèmes exportés`);
