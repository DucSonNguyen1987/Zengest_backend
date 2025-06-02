require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const MenuItem = require('../models/Menu');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// Données du menu Pause Café
const menuData = {
  // PLATS PRINCIPAUX
  mains: [
    {
      name: 'Poulet "Crousti-Crousti"',
      description: 'Poulet croustillant, purée maison, sweet chili sauce',
      category: 'mains',
      subcategory: 'volaille',
      priceVariants: [{ size: 'portion', price: 14, isDefault: true }],
      tags: ['signature', 'popular'],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Tartare de Bœuf',
      description: 'Tartare de bœuf à notre façon, servi avec frites maison',
      category: 'mains',
      subcategory: 'viande',
      priceVariants: [{ size: 'portion', price: 21, isDefault: true }],
      tags: ['signature', 'premium'],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Pavé de Bœuf',
      description: 'Pavé de bœuf sauce béarnaise, servi avec frites maison',
      category: 'mains',
      subcategory: 'viande',
      priceVariants: [{ size: 'portion', price: 15, isDefault: true }],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Cheese Burger',
      description: 'Potato bun, cheddar affiné 9 mois, oignons confits, sauce secrète, frites maison',
      category: 'mains',
      subcategory: 'burger',
      priceVariants: [{ size: 'portion', price: 17.5, isDefault: true }],
      tags: ['popular'],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Bacon Cheese Burger',
      description: 'Cheddar affiné 9 mois, oignons confits, sauce secrète, bacon, frites maison',
      category: 'mains',
      subcategory: 'burger',
      priceVariants: [{ size: 'portion', price: 16, isDefault: true }],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Pork Bun',
      description: 'Effiloché de porc fumé, coleslaw de choux rouges, sauce spicy BBQ, frites maison',
      category: 'mains',
      subcategory: 'viande',
      priceVariants: [{ size: 'portion', price: 16, isDefault: true }],
      tags: ['spicy'],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false, isSpicy: true, spicyLevel: 2 }
    },
    {
      name: 'Orecchiette Pesto Pistache',
      description: 'Orecchiette, pesto de pistache & basilic, parmesan',
      category: 'mains',
      subcategory: 'pâtes',
      priceVariants: [{ size: 'portion', price: 17.5, isDefault: true }],
      tags: ['vegetarian'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Saumon Laqué Teriyaki',
      description: 'Saumon "Label Rouge", sauce sriracha & riz du dragon',
      category: 'mains',
      subcategory: 'poisson',
      priceVariants: [{ size: 'portion', price: 15, isDefault: true }],
      tags: ['healthy', 'label-rouge'],
      dietary: { isGlutenFree: true, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Thon Albacore Mi-Cuit',
      description: 'Thon albacore mi-cuit, sauce sésame, aubergines "Hong Shao"',
      category: 'mains',
      subcategory: 'poisson',
      priceVariants: [{ size: 'portion', price: 18, isDefault: true }],
      tags: ['premium', 'healthy'],
      dietary: { isGlutenFree: true, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Dahl de Lentilles',
      description: 'Dahl de lentilles, riz du dragon',
      category: 'mains',
      subcategory: 'végétarien',
      priceVariants: [{ size: 'portion', price: 13, isDefault: true }],
      tags: ['vegan', 'healthy'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: true }
    },
    {
      name: 'Veggie Burger',
      description: 'Halloumi, portobello et frites de patates douces',
      category: 'mains',
      subcategory: 'végétarien',
      priceVariants: [{ size: 'portion', price: 15, isDefault: true }],
      tags: ['vegetarian'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Lasagnes de Légumes',
      description: 'Aubergines, courgettes, sauce tomate et roquette',
      category: 'mains',
      subcategory: 'végétarien',
      priceVariants: [{ size: 'portion', price: 14.5, isDefault: true }],
      tags: ['vegetarian'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    }
  ],

  // SALADES
  salads: [
    {
      name: 'Salade Chinoise',
      description: 'Poulet snacké, maki au concombre, Shanghai sauce',
      category: 'salads',
      priceVariants: [{ size: 'portion', price: 15, isDefault: true }],
      tags: ['healthy', 'asian'],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Salade Avocat Quinoa Halloumi',
      description: 'Avocat, quinoa, halloumi rôti aux herbes',
      category: 'salads',
      priceVariants: [{ size: 'portion', price: 15, isDefault: true }],
      tags: ['vegetarian', 'healthy'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Salade Avocat Quinoa Poulet',
      description: 'Avocat, quinoa, poulet mariné au miel d\'épices & sésame',
      category: 'salads',
      priceVariants: [{ size: 'portion', price: 15, isDefault: true }],
      tags: ['healthy'],
      dietary: { isGlutenFree: true, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Chirashi Bowl Saumon',
      description: 'Saumon "Label Rouge", riz vinaigré, avocat & sauce ponzu',
      category: 'salads',
      priceVariants: [{ size: 'portion', price: 16.5, isDefault: true }],
      tags: ['healthy', 'japanese', 'label-rouge'],
      dietary: { isGlutenFree: true, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Carpaccio de Bœuf',
      description: 'Frites maison, roquette, câpres et parmesan',
      category: 'salads',
      priceVariants: [{ size: 'portion', price: 16, isDefault: true }],
      tags: ['premium'],
      dietary: { isGlutenFree: true, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Satay de Volaille',
      description: 'Nouilles chinoises et légumes sautés',
      category: 'salads',
      priceVariants: [{ size: 'portion', price: 15, isDefault: true }],
      tags: ['asian'],
      dietary: { isGlutenFree: false, isVegetarian: false, isVegan: false }
    }
  ],

  // ENTRÉES
  appetizers: [
    {
      name: 'Tarama Sumac',
      description: 'Tarama maison, sumac',
      category: 'appetizers',
      priceVariants: [{ size: 'portion', price: 7, isDefault: true }],
      tags: ['mediterranean'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Œufs Pochés Bio en Cocotte',
      description: 'Ciboulette (bacon +1€)',
      category: 'appetizers',
      priceVariants: [{ size: 'portion', price: 8, isDefault: true }],
      tags: ['bio'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: false, isOrganic: true }
    },
    {
      name: 'Houmous',
      description: 'Huile au piment d\'Alep, pita maison',
      category: 'appetizers',
      priceVariants: [{ size: 'portion', price: 8, isDefault: true }],
      tags: ['vegan', 'mediterranean'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: true }
    },
    {
      name: 'Straciatella',
      description: 'Huile vierge, poires rôties, romarin et pain grillé',
      category: 'appetizers',
      priceVariants: [{ size: 'portion', price: 10, isDefault: true }],
      tags: ['premium'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Assiette de Charcuterie',
      description: 'Jambon de pays, coppa, chorizo, saucisson sec - Maison "MAS"',
      category: 'appetizers',
      priceVariants: [
        { size: 'assiette', price: 17, isDefault: true },
        { size: 'à l\'unité', price: 7, isDefault: false }
      ],
      tags: ['premium', 'artisanal'],
      dietary: { isGlutenFree: true, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Combo Charcuterie + Fromages',
      description: 'Charcuterie + Comté 18 mois + Saint Nectaire fermier',
      category: 'appetizers',
      priceVariants: [{ size: 'portion', price: 20, isDefault: true }],
      tags: ['premium', 'artisanal'],
      dietary: { isGlutenFree: true, isVegetarian: false, isVegan: false }
    },
    {
      name: 'Falafels',
      description: 'Sauce yaourt citron / tahini',
      category: 'appetizers',
      priceVariants: [{ size: 'portion', price: 8, isDefault: true }],
      tags: ['vegan', 'mediterranean'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: true }
    }
  ],

  // ACCOMPAGNEMENTS
  sides: [
    {
      name: 'Frites Homemade',
      description: 'Frites maison cuites en 2 cuissons',
      category: 'sides',
      priceVariants: [{ size: 'portion', price: 5, isDefault: true }],
      tags: ['popular'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: true }
    },
    {
      name: 'Sweet Potatoes',
      description: 'Frites de patates douces',
      category: 'sides',
      priceVariants: [{ size: 'portion', price: 6, isDefault: true }],
      tags: ['healthy'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: true }
    },
    {
      name: 'Purée Maison',
      description: 'Purée de pommes de terre maison',
      category: 'sides',
      priceVariants: [{ size: 'portion', price: 5, isDefault: true }],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Aubergines "Hong Shao"',
      description: 'Aubergines à la chinoise',
      category: 'sides',
      priceVariants: [{ size: 'portion', price: 6, isDefault: true }],
      tags: ['asian'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: true }
    }
  ],

  // DESSERTS
  desserts: [
    {
      name: 'Cookie Choco-Noisettes',
      description: 'Cookie maison chocolat et noisettes',
      category: 'desserts',
      priceVariants: [
        { size: 'simple', price: 4, isDefault: true },
        { size: 'avec glace', price: 7, isDefault: false }
      ],
      tags: ['homemade'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Tiramisu',
      description: 'Tiramisu maison',
      category: 'desserts',
      priceVariants: [
        { size: 'simple', price: 6, isDefault: true },
        { size: 'avec café', price: 7, isDefault: false }
      ],
      tags: ['homemade', 'italian'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Cookie + Café',
      description: 'Cookie choco-noisettes accompagné d\'un café',
      category: 'desserts',
      priceVariants: [{ size: 'combo', price: 7, isDefault: true }],
      tags: ['combo'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Gâteau Chocolat',
      description: 'Gâteau au chocolat maison',
      category: 'desserts',
      priceVariants: [{ size: 'portion', price: 6, isDefault: true }],
      tags: ['homemade'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Riz au Lait Vanillé',
      description: 'Caramel beurre salé, spéculoos',
      category: 'desserts',
      priceVariants: [{ size: 'portion', price: 7, isDefault: true }],
      tags: ['homemade'],
      dietary: { isGlutenFree: false, isVegetarian: true, isVegan: false }
    }
  ],

  // FROMAGES
  cheeses: [
    {
      name: 'Comté Affiné 18 mois',
      description: 'Comté affiné 18 mois',
      category: 'cheeses',
      priceVariants: [{ size: 'portion', price: 6, isDefault: true }],
      tags: ['premium', 'artisanal'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Saint Nectaire Fermier',
      description: 'Saint Nectaire fermier',
      category: 'cheeses',
      priceVariants: [{ size: 'portion', price: 6, isDefault: true }],
      tags: ['artisanal'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: false }
    },
    {
      name: 'Plateau de Fromages',
      description: 'Comté 18 mois et Saint Nectaire fermier',
      category: 'cheeses',
      priceVariants: [{ size: 'plateau', price: 10, isDefault: true }],
      tags: ['premium'],
      dietary: { isGlutenFree: true, isVegetarian: true, isVegan: false }
    }
  ],

  // VINS ROUGES
  wines_red: [
    {
      name: 'Côtes de Bordeaux "Pirouette"',
      description: 'Château Les Vieux Moulins (Bio)',
      category: 'wines_red',
      priceVariants: [
        { size: '12.5cl', price: 5, isDefault: false },
        { size: '35cl', price: 11, isDefault: true },
        { size: '75cl', price: 22, isDefault: false }
      ],
      tags: ['bio'],
      dietary: { isOrganic: true },
      nutrition: { alcohol: 13.5 }
    },
    {
      name: 'Côtes de Castillon "Y\'a de la Joie"',
      description: 'Cousins & Co x Château Beynat (Vin Nature)',
      category: 'wines_red',
      priceVariants: [
        { size: '12.5cl', price: 6, isDefault: false },
        { size: '35cl', price: 13, isDefault: true },
        { size: '75cl', price: 26, isDefault: false }
      ],
      tags: ['nature'],
      nutrition: { alcohol: 14 }
    },
    {
      name: 'Bourgueil "Trinch"',
      description: 'Catherine & Pierre Breton (Bio)',
      category: 'wines_red',
      priceVariants: [
        { size: '12.5cl', price: 7, isDefault: false },
        { size: '35cl', price: 15, isDefault: true },
        { size: '75cl', price: 30, isDefault: false }
      ],
      tags: ['bio', 'premium'],
      dietary: { isOrganic: true },
      nutrition: { alcohol: 13 }
    }
  ],

  // VINS BLANCS
  wines_white: [
    {
      name: 'Côteaux de Vendômois',
      description: 'Domaine du Four à Chaux - Chenin (Culture Raisonnée)',
      category: 'wines_white',
      priceVariants: [
        { size: '12.5cl', price: 5, isDefault: false },
        { size: '35cl', price: 11, isDefault: true },
        { size: '75cl', price: 22, isDefault: false }
      ],
      nutrition: { alcohol: 12.5 }
    },
    {
      name: 'Menetou-Salon "Remoortere"',
      description: 'Sauvignon (Bio)',
      category: 'wines_white',
      priceVariants: [
        { size: '12.5cl', price: 8, isDefault: false },
        { size: '35cl', price: 17, isDefault: true },
        { size: '75cl', price: 34, isDefault: false }
      ],
      tags: ['bio'],
      dietary: { isOrganic: true },
      nutrition: { alcohol: 13 }
    }
  ],

  // COCKTAILS
  cocktails: [
    {
      name: 'Bramble',
      description: 'London Dry Gin, crème de mûre, citron vert, simple sirop',
      category: 'cocktails',
      priceVariants: [{ size: '25cl', price: 10, isDefault: true }],
      tags: ['signature'],
      nutrition: { alcohol: 20 }
    },
    {
      name: 'Basil Smash',
      description: 'Gin, basilic, citron vert, simple sirop',
      category: 'cocktails',
      priceVariants: [{ size: '25cl', price: 10, isDefault: true }],
      tags: ['fresh'],
      nutrition: { alcohol: 22 }
    },
    {
      name: 'Expresso Martini',
      description: 'Vodka, liqueur de café, shot d\'espresso, simple sirop',
      category: 'cocktails',
      priceVariants: [{ size: '25cl', price: 11, isDefault: true }],
      tags: ['popular', 'coffee'],
      nutrition: { alcohol: 25 }
    },
    {
      name: 'Porn Star Martini',
      description: 'Vodka, Passoa, sirop de vanille, fruit de la passion, Vouvray pétillant',
      category: 'cocktails',
      priceVariants: [{ size: '25cl', price: 12, isDefault: true }],
      tags: ['signature', 'exotic'],
      nutrition: { alcohol: 18 }
    },
    {
      name: 'Negroni Classico',
      description: 'Gin, Campari, Vermouth Otto\'s',
      category: 'cocktails',
      priceVariants: [{ size: '25cl', price: 11, isDefault: true }],
      tags: ['classic'],
      nutrition: { alcohol: 28 }
    }
  ],

  // MOCKTAILS
  mocktails: [
    {
      name: 'Sweet Berry',
      description: 'Vermouth Otto\'s, crème de framboise, Perrier, Peychaud bitter, citron vert, simple sirop',
      category: 'mocktails',
      priceVariants: [{ size: '25cl', price: 10, isDefault: true }],
      tags: ['fruity', 'fresh'],
      nutrition: { alcohol: 0 }
    },
    {
      name: 'Tiki Boubou',
      description: 'Tonka, ananas, orange, citron vert',
      category: 'mocktails',
      priceVariants: [{ size: '25cl', price: 7, isDefault: true }],
      tags: ['tropical', 'exotic'],
      nutrition: { alcohol: 0 }
    },
    {
      name: 'Ginger Mojito',
      description: 'Ginger beer, menthe, citron vert, sucre',
      category: 'mocktails',
      priceVariants: [{ size: '25cl', price: 7, isDefault: true }],
      tags: ['fresh', 'spicy'],
      nutrition: { alcohol: 0 }
    }
  ],

  // BIÈRES
  beers: [
    {
      name: 'Stella Artois',
      description: 'Bière blonde belge',
      category: 'beers',
      priceVariants: [
        { size: '25cl (pression)', price: 4, isDefault: true },
        { size: '50cl (pression)', price: 6.5, isDefault: false }
      ],
      nutrition: { alcohol: 5.2 }
    },
    {
      name: 'Deck & Donohue "Mission" Pale Ale',
      description: 'Pale Ale artisanale (Bio)',
      category: 'beers',
      priceVariants: [
        { size: '25cl', price: 4.8, isDefault: true },
        { size: '33cl', price: 8.5, isDefault: false }
      ],
      tags: ['bio', 'artisanal'],
      dietary: { isOrganic: true },
      nutrition: { alcohol: 4.8 }
    },
    {
      name: 'Demory Blanche',
      description: 'Bière blanche artisanale',
      category: 'beers',
      priceVariants: [
        { size: '25cl', price: 5, isDefault: true },
        { size: '33cl', price: 9, isDefault: false }
      ],
      tags: ['artisanal'],
      nutrition: { alcohol: 4.5 }
    }
  ]
};

const seedMenuData = async () => {
  try {
    console.log('🚀 Initialisation des données du menu...');
    
    // Connexion MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connexion MongoDB réussie');
    
    // Récupérer le restaurant et un utilisateur manager
    const restaurant = await Restaurant.findOne({ name: 'Le Bistrot de Zengest' });
    if (!restaurant) {
      throw new Error('Restaurant "Le Bistrot de Zengest" non trouvé. Lancez d\'abord le script seedData.js');
    }
    
    const manager = await User.findOne({ 
      role: 'manager', 
      restaurantId: restaurant._id 
    });
    if (!manager) {
      throw new Error('Manager non trouvé pour ce restaurant');
    }
    
    console.log(`✅ Restaurant trouvé: ${restaurant.name}`);
    console.log(`✅ Manager trouvé: ${manager.firstName} ${manager.lastName}`);
    
    // Supprimer les items existants
    const existingItems = await MenuItem.countDocuments({ restaurantId: restaurant._id });
    if (existingItems > 0) {
      console.log(`🗑️  Suppression de ${existingItems} items existants...`);
      await MenuItem.deleteMany({ restaurantId: restaurant._id });
    }
    
    console.log('\n🍽️  Création du menu basé sur la carte Pause Café...');
    
    let totalCreated = 0;
    
    // Créer les items par catégorie
    for (const [categoryName, items] of Object.entries(menuData)) {
      console.log(`\n📋 Création des items: ${categoryName}...`);
      
      for (let i = 0; i < items.length; i++) {
        const itemData = {
          ...items[i],
          restaurantId: restaurant._id,
          createdBy: manager._id,
          displayOrder: i + 1
        };
        
        try {
          const menuItem = await MenuItem.create(itemData);
          console.log(`   ✅ ${menuItem.name} - ${menuItem.basePrice}€`);
          totalCreated++;
        } catch (error) {
          console.error(`   ❌ Erreur pour "${items[i].name}":`, error.message);
        }
      }
    }
    
    // Statistiques finales
    const finalCount = await MenuItem.countDocuments({ restaurantId: restaurant._id });
    
    console.log('\n🎉 Initialisation du menu terminée !');
    console.log(`📊 Total items créés: ${totalCreated}`);
    console.log(`📊 Total items dans la base: ${finalCount}`);
    
    // Afficher un résumé par catégorie
    console.log('\n📈 Résumé par catégorie:');
    const categories = await MenuItem.aggregate([
      { $match: { restaurantId: restaurant._id } },
      { $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$basePrice' } } },
      { $sort: { count: -1 } }
    ]);
    
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} items (prix moyen: ${cat.avgPrice.toFixed(2)}€)`);
    });
    
    // Items les plus chers et moins chers
    const mostExpensive = await MenuItem.findOne({ restaurantId: restaurant._id })
      .sort({ basePrice: -1 })
      .select('name basePrice category');
      
    const cheapest = await MenuItem.findOne({ restaurantId: restaurant._id })
      .sort({ basePrice: 1 })
      .select('name basePrice category');
    
    console.log('\n💰 Prix:');
    console.log(`   Plus cher: ${mostExpensive.name} - ${mostExpensive.basePrice}€ (${mostExpensive.category})`);
    console.log(`   Moins cher: ${cheapest.name} - ${cheapest.basePrice}€ (${cheapest.category})`);
    
    // Items végétariens/végans
    const vegetarianCount = await MenuItem.countDocuments({ 
      restaurantId: restaurant._id, 
      'dietary.isVegetarian': true 
    });
    const veganCount = await MenuItem.countDocuments({ 
      restaurantId: restaurant._id, 
      'dietary.isVegan': true 
    });
    
    console.log('\n🌱 Options alimentaires:');
    console.log(`   Végétarien: ${vegetarianCount} items`);
    console.log(`   Végan: ${veganCount} items`);
    
    console.log('\n🔗 Testez votre API Menu:');
    console.log('Tous les items: GET http://localhost:3000/api/menu');
    console.log('Items par catégorie: GET http://localhost:3000/api/menu?category=mains');
    console.log('Recherche: GET http://localhost:3000/api/menu/search?q=burger');
    
    await mongoose.connection.close();
    console.log('\n✅ Script terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error.message);
    console.error('Stack:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

// Lancer le script si exécuté directement
if (require.main === module) {
  console.log('🎬 Lancement du script de création du menu...');
  seedMenuData();
}

module.exports = seedMenuData;