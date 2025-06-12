// check-modules.js - Vérification rapide des modules
const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification des modules Node.js...\n');

// Modules critiques pour Zengest
const criticalModules = [
  'express',
  'morgan', 
  'mongoose',
  'dotenv',
  'cors',
  'helmet',
  'bcryptjs',
  'jsonwebtoken',
  'joi',
  'nodemailer'
];

const nodeModulesPath = path.join(__dirname, 'node_modules');
const packageJsonPath = path.join(__dirname, 'package.json');

// Vérifier package.json
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json manquant !');
  process.exit(1);
}

// Vérifier node_modules
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ Dossier node_modules manquant !');
  console.log('💡 Exécutez: yarn install');
  process.exit(1);
}

console.log('📦 État des modules critiques:');
console.log('-'.repeat(40));

let missingModules = [];
let installedCount = 0;

criticalModules.forEach(module => {
  const modulePath = path.join(nodeModulesPath, module);
  const isInstalled = fs.existsSync(modulePath);
  
  if (isInstalled) {
    console.log(`✅ ${module}`);
    installedCount++;
  } else {
    console.log(`❌ ${module} - MANQUANT`);
    missingModules.push(module);
  }
});

console.log('\n📊 Résumé:');
console.log(`✅ Installés: ${installedCount}/${criticalModules.length}`);
console.log(`❌ Manquants: ${missingModules.length}`);

if (missingModules.length > 0) {
  console.log('\n🔧 Commandes de correction:');
  console.log(`yarn add ${missingModules.join(' ')}`);
  console.log('# Puis: yarn install');
} else {
  console.log('\n🎉 Tous les modules critiques sont installés !');
  console.log('🚀 Vous pouvez lancer: yarn start');
}

// Vérifier la version de Node.js
console.log(`\n🐛 Node.js: ${process.version}`);
if (parseInt(process.version.slice(1)) < 18) {
  console.warn('⚠️  Node.js 18+ recommandé');
}