// find-bad-routes.js - Identifier les routes problématiques
const fs = require('fs');
const path = require('path');

console.log('🔍 RECHERCHE DES ROUTES PROBLÉMATIQUES');
console.log('='.repeat(50));

// Patterns de routes potentiellement problématiques
const suspiciousPatterns = [
  /router\.[a-z]+\(['"`]\/:[^a-zA-Z0-9_]/g,  // /:x où x n'est pas alphanumeric
  /router\.[a-z]+\(['"`]\/:\s*['"`]/g,       // /: suivi d'espace ou fin
  /router\.[a-z]+\(['"`][^'"`]*\/:[^a-zA-Z0-9_]/g, // /:x dans une route
  /router\.[a-z]+\(['"`][^'"`]*\/:\?/g,      // /:?
  /router\.[a-z]+\(['"`][^'"`]*\/:\(/g,      // /:(
  /router\.[a-z]+\(['"`][^'"`]*\/:\*/g,      // /:*
];

// Patterns corrects pour vérification
const validPatterns = [
  /router\.[a-z]+\(['"`]\/:[a-zA-Z_][a-zA-Z0-9_]*['"`]/g,
];

const routeFiles = [
  'src/routes/auth.js',
  'src/routes/users.js', 
  'src/routes/restaurants.js',
  'src/routes/orders.js',
  'src/routes/menu.js',
  'src/routes/reservations.js',
  'src/routes/floorplans.js',
  'src/routes/notifications.js'
];

let problemsFound = 0;

routeFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filePath} - FICHIER MANQUANT`);
    return;
  }
  
  console.log(`\n📁 ${filePath}`);
  console.log('-'.repeat(30));
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Chercher toutes les définitions de routes
    const routeDefinitions = content.match(/router\.[a-z]+\([^)]+\)/g) || [];
    
    console.log(`📊 ${routeDefinitions.length} définitions de routes trouvées`);
    
    // Analyser chaque route
    routeDefinitions.forEach((route, index) => {
      const lineNumber = content.substring(0, content.indexOf(route)).split('\n').length;
      
      // Vérifier les patterns suspects
      let hasProblem = false;
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(route)) {
          console.log(`❌ PROBLÈME ligne ${lineNumber}: ${route}`);
          console.log(`   💡 Pattern suspect détecté`);
          hasProblem = true;
          problemsFound++;
        }
      });
      
      // Vérifier les paramètres vides ou malformés
      const paramMatches = route.match(/\/:[^\/,)'\s]*/g);
      if (paramMatches) {
        paramMatches.forEach(param => {
          if (param === '/:' || param.length <= 2) {
            console.log(`❌ PARAMÈTRE VIDE ligne ${lineNumber}: ${route}`);
            console.log(`   💡 Paramètre "${param}" invalide`);
            hasProblem = true;
            problemsFound++;
          }
          
          // Vérifier les caractères invalides
          if (!/^\/:[a-zA-Z_][a-zA-Z0-9_]*$/.test(param) && !param.includes('(') && !param.includes('?')) {
            console.log(`❌ PARAMÈTRE INVALIDE ligne ${lineNumber}: ${route}`);
            console.log(`   💡 Paramètre "${param}" contient des caractères invalides`);
            hasProblem = true;
            problemsFound++;
          }
        });
      }
      
      if (!hasProblem && route.includes('/:')) {
        console.log(`✅ Route OK ligne ${lineNumber}: ${route.substring(0, 50)}...`);
      }
    });
    
    // Chercher les imports et use qui pourraient poser problème
    const appUseMatches = content.match(/app\.use\([^)]+\)/g) || [];
    const routerUseMatches = content.match(/router\.use\([^)]+\)/g) || [];
    
    [...appUseMatches, ...routerUseMatches].forEach(use => {
      if (use.includes('/:') && !/\/:[a-zA-Z_][a-zA-Z0-9_]*/.test(use)) {
        const lineNumber = content.substring(0, content.indexOf(use)).split('\n').length;
        console.log(`❌ USE PROBLÉMATIQUE ligne ${lineNumber}: ${use}`);
        problemsFound++;
      }
    });
    
  } catch (error) {
    console.log(`❌ Erreur lecture ${filePath}: ${error.message}`);
  }
});

// Vérifier app.js aussi
console.log(`\n📁 app.js`);
console.log('-'.repeat(30));

if (fs.existsSync('app.js')) {
  try {
    const content = fs.readFileSync('app.js', 'utf8');
    
    // Chercher les app.use qui montent les routes
    const mountPoints = content.match(/app\.use\([^)]+\)/g) || [];
    
    mountPoints.forEach(mount => {
      const lineNumber = content.substring(0, content.indexOf(mount)).split('\n').length;
      
      if (mount.includes('/:') && !/\/:[a-zA-Z_][a-zA-Z0-9_]*/.test(mount)) {
        console.log(`❌ MONTAGE PROBLÉMATIQUE ligne ${lineNumber}: ${mount}`);
        problemsFound++;
      } else if (mount.includes('/api/')) {
        console.log(`✅ Montage OK ligne ${lineNumber}: ${mount}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Erreur lecture app.js: ${error.message}`);
  }
}

console.log('\n📊 RÉSUMÉ');
console.log('='.repeat(50));
console.log(`🚨 Problèmes trouvés: ${problemsFound}`);

if (problemsFound === 0) {
  console.log('✅ Aucun problème de route détecté avec cette méthode');
  console.log('💡 Le problème pourrait être plus subtil:');
  console.log('   • Caractères unicode invisibles');
  console.log('   • Importation de route externe');
  console.log('   • Middleware qui modifie les routes');
  console.log('\n🔧 Suggestions:');
  console.log('   1. Vérifiez les logs d\'express avec DEBUG=express:*');
  console.log('   2. Commentez les routes une par une pour isoler');
  console.log('   3. Vérifiez les middleware de troisième partie');
} else {
  console.log('🔧 Corrigez les problèmes listés ci-dessus');
}

console.log('\n🏁 FIN DE L\'ANALYSE');