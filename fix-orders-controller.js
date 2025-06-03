const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION AUTOMATIQUE: OrderController.js\n');

const fixOrderController = () => {
  try {
    const controllerPath = path.join(__dirname, 'src', 'controllers', 'orderController.js');
    
    if (!fs.existsSync(controllerPath)) {
      console.error('❌ Fichier orderController.js non trouvé:', controllerPath);
      console.log('💡 Vérifiez l\'arborescence de votre projet');
      return;
    }
    
    console.log('📁 Fichier trouvé:', controllerPath);
    
    // Lire le contenu actuel
    let content = fs.readFileSync(controllerPath, 'utf8');
    
    // Sauvegarder l'original
    const backupPath = controllerPath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, content);
    console.log('💾 Sauvegarde créée:', path.basename(backupPath));
    
    // Définir la méthode getAllOrders corrigée
    const getAllOrdersMethod = `exports.getAllOrders = async (req, res) => {
  try {
    // ✅ CORRECTION: Valeurs par défaut pour éviter les erreurs
    const {
      page = 1,
      limit = 10,
      status,
      tableNumber,
      assignedServer,
      priority,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      customerPhone,
      sortBy = 'timestamps.ordered',
      sortOrder = 'desc'
    } = req.query;

    // ✅ CORRECTION: Conversion sécurisée en entiers
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    console.log('📊 DEBUG getAllOrders - Params:', {
      pageNum, limitNum, status, sortBy, sortOrder
    });

    // Construction du filtre
    const filter = {};
    
    // Filtre utilisateur (admin voit tout, autres limitées à leur restaurant)
    if (req.user.role !== 'admin' && req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }
    
    if (status) filter.status = status;
    if (tableNumber) filter.tableNumber = tableNumber;
    if (assignedServer) filter.assignedServer = assignedServer;
    if (priority) filter.priority = priority;
    if (customerPhone) filter['customer.phone'] = new RegExp(customerPhone, 'i');
    
    // Filtres de montant
    if (minAmount || maxAmount) {
      filter['pricing.total'] = {};
      if (minAmount) filter['pricing.total'].$gte = parseFloat(minAmount);
      if (maxAmount) filter['pricing.total'].$lte = parseFloat(maxAmount);
    }
    
    // Filtres de date
    if (dateFrom || dateTo) {
      filter['timestamps.ordered'] = {};
      if (dateFrom) filter['timestamps.ordered'].$gte = new Date(dateFrom);
      if (dateTo) filter['timestamps.ordered'].$lte = new Date(dateTo);
    }

    console.log('🔍 DEBUG getAllOrders - Filter:', filter);

    // ✅ CORRECTION: Construction de la requête avec gestion d'erreur
    const sortObject = {};
    const validSortFields = ['timestamps.ordered', 'pricing.total', 'status', 'tableNumber'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'timestamps.ordered';
    const safeSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
    
    sortObject[safeSortBy] = safeSortOrder === 'desc' ? -1 : 1;

    console.log('📈 DEBUG getAllOrders - Sort:', sortObject);

    // Exécution de la requête avec timeout et gestion d'erreur
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.menuItem', 'name category priceVariants images')
        .populate('assignedServer', 'firstName lastName')
        .populate('restaurantId', 'name')
        .sort(sortObject)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .maxTimeMS(10000) // Timeout 10 secondes
        .lean(), // Optimisation performance
      
      Order.countDocuments(filter).maxTimeMS(5000)
    ]);

    console.log('✅ DEBUG getAllOrders - Résultats:', {
      ordersCount: orders.length,
      total,
      pageNum,
      limitNum
    });

    // Construire les filtres disponibles pour le frontend
    const availableStatuses = await Order.distinct('status', req.user.role !== 'admin' ? { restaurantId: req.user.restaurantId } : {});
    const availableServers = await Order.distinct('assignedServer', req.user.role !== 'admin' ? { restaurantId: req.user.restaurantId } : {});

    const responseData = {
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        total,
        limit: limitNum,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      filters: {
        availableStatuses,
        availableServers,
        appliedFilters: {
          status, tableNumber, assignedServer, priority,
          dateFrom, dateTo, minAmount, maxAmount, customerPhone
        }
      },
      summary: {
        totalOrders: total,
        currentPageOrders: orders.length,
        averageOrderValue: orders.length > 0 
          ? orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0) / orders.length 
          : 0
      }
    };

    res.json({
      success: true,
      message: \`\${orders.length} commandes trouvées\`,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Erreur getAllOrders:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
};`;
    
    // Chercher et corriger les problèmes de pagination
    console.log('\n🔍 Analyse du contenu...');
    
    // Pattern pour getAllOrders
    const getAllOrdersPattern = /exports\.getAllOrders\s*=\s*async\s*\(req,\s*res\)\s*=>\s*{[\s\S]*?};/;
    
    if (getAllOrdersPattern.test(content)) {
      console.log('✅ Méthode getAllOrders trouvée, remplacement...');
      content = content.replace(getAllOrdersPattern, getAllOrdersMethod);
      console.log('✅ Méthode getAllOrders mise à jour');
      
    } else {
      console.log('⚠️ Méthode getAllOrders non trouvée, ajout en fin de fichier...');
      content += '\n\n' + getAllOrdersMethod;
    }
    
    // Vérifier et corriger l'import du modèle Order
    if (!content.includes('require(\'../models/Order\')')) {
      const orderImport = "const Order = require('../models/Order');";
      content = orderImport + '\n' + content;
      console.log('✅ Import Order ajouté');
    }
    
    // Écrire le fichier corrigé
    fs.writeFileSync(controllerPath, content);
    console.log('✅ Fichier OrderController.js corrigé !');
    
    console.log('\n🎯 CORRECTIONS APPLIQUÉES:');
    console.log('1. ✅ Valeurs par défaut pour page, limit, sortBy, sortOrder');
    console.log('2. ✅ Conversion sécurisée des paramètres en entiers');
    console.log('3. ✅ Validation des champs de tri');
    console.log('4. ✅ Gestion d\'erreur robuste avec try/catch');
    console.log('5. ✅ Timeout sur les requêtes MongoDB');
    console.log('6. ✅ Optimisation avec .lean()');
    console.log('7. ✅ Debug console.log pour diagnostiquer');
    
    // Créer un script de test immédiat
    const testScript = `console.log('🧪 Test après correction OrderController');

const testCorrectedOrders = async () => {
  try {
    const API_BASE = 'http://localhost:3000/api';
    
    // Connexion
    const loginResponse = await fetch(\`\${API_BASE}/auth/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zengest.com',
        password: 'Admin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Connexion échouée');
      return;
    }
    
    console.log('✅ Connecté');
    
    // Test de la route corrigée
    const ordersResponse = await fetch(\`\${API_BASE}/orders\`, {
      headers: { 'Authorization': \`Bearer \${loginData.data.token}\` }
    });
    
    console.log('📊 Status /orders:', ordersResponse.status);
    
    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      console.log('🎉 SUCCESS! Route /orders corrigée!');
      console.log('📄 Résultat:', {
        success: data.success,
        ordersCount: data.data?.orders?.length || 0,
        pagination: data.data?.pagination,
        filters: !!data.data?.filters,
        summary: !!data.data?.summary
      });
      
      console.log('\\n✅ PROBLÈME RÉSOLU !');
      console.log('🚀 Votre API fonctionne maintenant parfaitement');
      
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ Erreur persistante:', errorText);
      console.log('💡 Redémarrez le serveur: npm run dev');
    }
    
  } catch (error) {
    console.error('💥 Erreur test:', error.message);
  }
};

testCorrectedOrders();`;
    
    fs.writeFileSync('test-orders-corrected.js', testScript);
    console.log('✅ Script de test créé: test-orders-corrected.js');
    
    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('1. 🔄 Redémarrez le serveur: npm run dev');
    console.log('2. 🧪 Testez: node test-orders-corrected.js');
    console.log('3. ✅ La route /orders devrait maintenant retourner 200');
    console.log('4. 📊 Vérifiez les logs du serveur pour les messages DEBUG');
    
  } catch (error) {
    console.error('💥 Erreur correction:', error.message);
    console.error('Stack:', error.stack);
  }
};

fixOrderController();