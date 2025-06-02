require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const MenuItem = require('../models/Menu');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// Données du menu Pause Café complet
const menuData = {
  // ENTRÉES & APÉRITIFS
  appetizers: [
    {
      name: "Tarama Sumac",
      description: "Tarama maison au sumac",
      category: "appetizers",
      subcategory: "méditerranéen",
      priceVariants: [{ size: "portion", price: 7, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["méditerranéen", "poisson"]
    },
    {
      name: "Œufs Pochés Bio en Cocotte",
      description: "Œufs pochés bio en cocotte, ciboulette (bacon +1€)",
      category: "appetizers",
      subcategory: "bio",
      priceVariants: [
        { size: "sans bacon", price: 8, isDefault: true },
        { size: "avec bacon", price: 9, isDefault: false }
      ],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "œufs", "healthy"]
    },
    {
      name: "Houmous",
      description: "Houmous maison, huile au piment d'Alep, pita maison",
      category: "appetizers",
      subcategory: "végétarien",
      priceVariants: [{ size: "portion", price: 8, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: false, isOrganic: false, isSpicy: true, spicyLevel: 1 },
      tags: ["vegan", "méditerranéen", "maison"]
    },
    {
      name: "Straciatella",
      description: "Straciatella, huile vierge, poires rôties, romarin et pain grillé",
      category: "appetizers",
      subcategory: "fromage",
      priceVariants: [{ size: "portion", price: 10, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["fromage", "italien", "premium"]
    },
    {
      name: "Assiette de Charcuterie",
      description: "Jambon de pays, coppa, chorizo, saucisson sec - Maison \"MAS\"",
      category: "appetizers",
      subcategory: "charcuterie",
      priceVariants: [
        { size: "assiette complète", price: 17, isDefault: true },
        { size: "à l'unité", price: 7, isDefault: false }
      ],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["charcuterie", "artisanal", "maison MAS"]
    },
    {
      name: "Combo Charcuterie + Fromages",
      description: "Charcuterie + Comté 18 mois + Saint Nectaire fermier",
      category: "appetizers",
      subcategory: "plateau",
      priceVariants: [{ size: "plateau", price: 20, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["plateau", "fromage", "charcuterie", "premium"]
    },
    {
      name: "Falafels",
      description: "Falafels maison, sauce yaourt citron / tahini",
      category: "appetizers",
      subcategory: "végétarien",
      priceVariants: [{ size: "portion", price: 8, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["vegan", "méditerranéen", "healthy"]
    }
  ],

  // SALADES
  salads: [
    {
      name: "Salade Chinoise",
      description: "Poulet snacké, maki au concombre, Shanghai sauce",
      category: "salads",
      subcategory: "asiatique",
      priceVariants: [{ size: "portion", price: 15, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["asiatique", "poulet", "healthy"]
    },
    {
      name: "Salade Avocat Quinoa Halloumi",
      description: "Avocat, quinoa, halloumi rôti aux herbes",
      category: "salads",
      subcategory: "végétarien",
      priceVariants: [{ size: "portion", price: 15, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["végétarien", "healthy", "quinoa"]
    },
    {
      name: "Salade Avocat Quinoa Poulet",
      description: "Avocat, quinoa, poulet mariné au miel d'épices & sésame",
      category: "salads",
      subcategory: "healthy",
      priceVariants: [{ size: "portion", price: 15, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["healthy", "quinoa", "poulet"]
    },
    {
      name: "Chirashi Bowl Saumon",
      description: "Saumon \"Label Rouge\", riz vinaigré, avocat & sauce ponzu",
      category: "salads",
      subcategory: "japonais",
      priceVariants: [{ size: "portion", price: 16.5, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["japonais", "saumon", "label rouge", "healthy"]
    },
    {
      name: "Carpaccio de Bœuf",
      description: "Frites maison, roquette, câpres et parmesan",
      category: "salads",
      subcategory: "viande",
      priceVariants: [{ size: "portion", price: 16, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["bœuf", "italien", "premium"]
    },
    {
      name: "Satay de Volaille",
      description: "Nouilles chinoises et légumes sautés",
      category: "salads",
      subcategory: "asiatique",
      priceVariants: [{ size: "portion", price: 15, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: true, spicyLevel: 2 },
      tags: ["asiatique", "volaille", "épicé"]
    }
  ],

  // PLATS PRINCIPAUX
  mains: [
    {
      name: "Poulet \"Crousti-Crousti\"",
      description: "Poulet croustillant, purée maison, sweet chili sauce",
      category: "mains",
      subcategory: "volaille",
      priceVariants: [{ size: "portion", price: 14, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: true, spicyLevel: 1 },
      tags: ["signature", "poulet", "popular"]
    },
    {
      name: "Tartare de Bœuf",
      description: "Tartare de bœuf à notre façon, servi avec frites maison",
      category: "mains",
      subcategory: "viande",
      priceVariants: [{ size: "portion", price: 21, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["signature", "bœuf", "premium"]
    },
    {
      name: "Pavé de Bœuf",
      description: "Pavé de bœuf sauce béarnaise, servi avec frites maison",
      category: "mains",
      subcategory: "viande",
      priceVariants: [{ size: "portion", price: 15, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["bœuf", "classique"]
    },
    {
      name: "Cheese Burger",
      description: "Potato bun, cheddar affiné 9 mois, oignons confits, sauce secrète, frites maison",
      category: "mains",
      subcategory: "burger",
      priceVariants: [{ size: "portion", price: 17.5, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["burger", "popular", "cheddar"]
    },
    {
      name: "Bacon Cheese Burger",
      description: "Cheddar affiné 9 mois, oignons confits, sauce secrète & bacon, frites maison",
      category: "mains",
      subcategory: "burger",
      priceVariants: [{ size: "portion", price: 16, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["burger", "bacon", "cheddar"]
    },
    {
      name: "Pork Bun",
      description: "Effiloché de porc fumé, coleslaw de choux rouges, sauce spicy BBQ, frites maison",
      category: "mains",
      subcategory: "viande",
      priceVariants: [{ size: "portion", price: 16, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: true, spicyLevel: 3 },
      tags: ["porc", "BBQ", "épicé"]
    },
    {
      name: "Orecchiette Pesto Pistache",
      description: "Orecchiette, pesto de pistache & basilic, parmesan",
      category: "mains",
      subcategory: "pâtes",
      priceVariants: [{ size: "portion", price: 17.5, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["végétarien", "pâtes", "italien"]
    },
    {
      name: "Saumon Laqué Teriyaki",
      description: "Saumon \"Label Rouge\", sauce sriracha & riz du dragon",
      category: "mains",
      subcategory: "poisson",
      priceVariants: [{ size: "portion", price: 15, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: true, spicyLevel: 2 },
      tags: ["saumon", "label rouge", "asiatique"]
    },
    {
      name: "Thon Albacore Mi-Cuit",
      description: "Thon albacore mi-cuit, sauce sésame, aubergines \"Hong Shao\"",
      category: "mains",
      subcategory: "poisson",
      priceVariants: [{ size: "portion", price: 18, isDefault: true }],
      dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["thon", "premium", "asiatique"]
    },
    {
      name: "Dahl de Lentilles",
      description: "Dahl de lentilles, riz du dragon",
      category: "mains",
      subcategory: "végétarien",
      priceVariants: [{ size: "portion", price: 13, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: true, spicyLevel: 2 },
      tags: ["vegan", "healthy", "épicé"]
    },
    {
      name: "Veggie Burger",
      description: "Halloumi, portobello et frites de patates douces",
      category: "mains",
      subcategory: "végétarien",
      priceVariants: [{ size: "portion", price: 15, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["végétarien", "burger", "halloumi"]
    },
    {
      name: "Lasagnes de Légumes",
      description: "Aubergines, courgettes, sauce tomate et roquette",
      category: "mains",
      subcategory: "végétarien",
      priceVariants: [{ size: "portion", price: 14.5, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["végétarien", "italien", "légumes"]
    }
  ],

  // ACCOMPAGNEMENTS
  sides: [
    {
      name: "Frites Homemade",
      description: "Frites maison cuites en 2 cuissons",
      category: "sides",
      priceVariants: [{ size: "portion", price: 5, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["maison", "popular"]
    },
    {
      name: "Sweet Potatoes",
      description: "Frites de patates douces",
      category: "sides",
      priceVariants: [{ size: "portion", price: 6, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["healthy", "sweet"]
    },
    {
      name: "Purée Maison",
      description: "Purée de pommes de terre maison",
      category: "sides",
      priceVariants: [{ size: "portion", price: 5, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["maison", "comfort"]
    },
    {
      name: "Aubergines \"Hong Shao\"",
      description: "Aubergines à la chinoise",
      category: "sides",
      priceVariants: [{ size: "portion", price: 6, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: true, spicyLevel: 2 },
      tags: ["asiatique", "épicé"]
    }
  ],

  // DESSERTS
  desserts: [
    {
      name: "Cookie Choco-Noisettes",
      description: "Cookie maison chocolat et noisettes",
      category: "desserts",
      priceVariants: [
        { size: "simple", price: 4, isDefault: true },
        { size: "avec glace", price: 7, isDefault: false }
      ],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["maison", "chocolat"]
    },
    {
      name: "Tiramisu",
      description: "Tiramisu maison",
      category: "desserts",
      priceVariants: [
        { size: "portion", price: 6, isDefault: true },
        { size: "avec café", price: 7, isDefault: false }
      ],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["maison", "italien", "café"]
    },
    {
      name: "Cookie + Café",
      description: "Cookie choco-noisettes accompagné d'un café",
      category: "desserts",
      priceVariants: [{ size: "combo", price: 7, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["combo", "café"]
    },
    {
      name: "Gâteau Chocolat",
      description: "Gâteau au chocolat maison",
      category: "desserts",
      priceVariants: [{ size: "portion", price: 6, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["maison", "chocolat"]
    },
    {
      name: "Riz au Lait Vanillé",
      description: "Caramel beurre salé, spéculoos",
      category: "desserts",
      priceVariants: [{ size: "portion", price: 7, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["maison", "comfort"]
    }
  ],

  // FROMAGES
  cheeses: [
    {
      name: "Comté Affiné 18 mois",
      description: "Comté affiné 18 mois",
      category: "cheeses",
      priceVariants: [{ size: "portion", price: 6, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["fromage", "premium", "affiné"]
    },
    {
      name: "Saint Nectaire Fermier",
      description: "Saint Nectaire fermier",
      category: "cheeses",
      priceVariants: [{ size: "portion", price: 6, isDefault: true }],
      dietary: { isVegetarian: true, isVegan: false, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["fromage", "fermier", "artisanal"]
    }
  ],

  // VINS ROSÉS
  wines_rose: [
    {
      name: "Gris de Nathalie",
      description: "Domaine du Petit Chaumont - IGP Sable de Camargue (Bio)",
      category: "wines_rose",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 5, isDefault: false },
        { size: "35cl", price: 11, isDefault: true },
        { size: "75cl", price: 22, isDefault: false }
      ],
      nutrition: { alcohol: 12.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "rosé", "Camargue"]
    },
    {
      name: "Côtes de Provence Symphonie",
      description: "Château Sainte Marguerite - Cru Classé (Bio)",
      category: "wines_rose",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 7, isDefault: false },
        { size: "35cl", price: 16, isDefault: true },
        { size: "75cl", price: 32, isDefault: false }
      ],
      nutrition: { alcohol: 13 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "rosé", "premium", "Provence"]
    }
  ],

  // VINS BLANCS
  wines_white: [
    {
      name: "Côteaux de Vendômois",
      description: "Domaine du Four à Chaux - Chenin (Culture Raisonnée)",
      category: "wines_white",
      subcategory: "Loire",
      priceVariants: [
        { size: "12.5cl", price: 5, isDefault: false },
        { size: "35cl", price: 11, isDefault: true },
        { size: "75cl", price: 22, isDefault: false }
      ],
      nutrition: { alcohol: 12.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["blanc", "Loire", "Chenin"]
    },
    {
      name: "Menetou-Salon Remoortere",
      description: "Sauvignon (Bio)",
      category: "wines_white",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 8, isDefault: false },
        { size: "35cl", price: 17, isDefault: true },
        { size: "75cl", price: 34, isDefault: false }
      ],
      nutrition: { alcohol: 13 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "blanc", "Sauvignon"]
    },
    {
      name: "Mas Foulaquier Into The White",
      description: "Vin Nature Non Filtré - Vin de France",
      category: "wines_white",
      subcategory: "nature",
      priceVariants: [
        { size: "12.5cl", price: 7, isDefault: false },
        { size: "35cl", price: 15, isDefault: true },
        { size: "75cl", price: 30, isDefault: false }
      ],
      nutrition: { alcohol: 13.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["nature", "blanc", "non filtré"]
    },
    {
      name: "Ailleurs Chardonnay",
      description: "Domaine Attilon - Chardonnay (Bio)",
      category: "wines_white",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 6.5, isDefault: false },
        { size: "35cl", price: 14, isDefault: true },
        { size: "75cl", price: 28, isDefault: false }
      ],
      nutrition: { alcohol: 13 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "blanc", "Chardonnay"]
    }
  ],

  // VINS ROUGES
  wines_red: [
    {
      name: "Côtes de Bordeaux Pirouette",
      description: "Château Les Vieux Moulins (Bio)",
      category: "wines_red",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 5, isDefault: false },
        { size: "35cl", price: 11, isDefault: true },
        { size: "75cl", price: 22, isDefault: false }
      ],
      nutrition: { alcohol: 13.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "rouge", "Bordeaux"]
    },
    {
      name: "Côtes de Castillon Y'a de la Joie",
      description: "Cousins & Co x Château Beynat (Vin Nature)",
      category: "wines_red",
      subcategory: "nature",
      priceVariants: [
        { size: "12.5cl", price: 6, isDefault: false },
        { size: "35cl", price: 13, isDefault: true },
        { size: "75cl", price: 26, isDefault: false }
      ],
      nutrition: { alcohol: 14 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["nature", "rouge", "Bordeaux"]
    },
    {
      name: "Bourgueil Trinch",
      description: "Catherine & Pierre Breton (Bio)",
      category: "wines_red",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 7, isDefault: false },
        { size: "35cl", price: 15, isDefault: true },
        { size: "75cl", price: 30, isDefault: false }
      ],
      nutrition: { alcohol: 13 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "rouge", "Loire"]
    },
    {
      name: "Côte Roannaise Éclat de Granite",
      description: "Domaine Sérol - Gamay (Bio)",
      category: "wines_red",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 7, isDefault: false },
        { size: "35cl", price: 15, isDefault: true },
        { size: "75cl", price: 30, isDefault: false }
      ],
      nutrition: { alcohol: 12.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "rouge", "Gamay"]
    }
  ],

  // CHAMPAGNE & PÉTILLANTS
  wines_sparkling: [
    {
      name: "Vouvray Pétillant La Dilettante",
      description: "Catherine & Pierre Breton (Bio)",
      category: "wines_sparkling",
      subcategory: "bio",
      priceVariants: [
        { size: "12.5cl", price: 8, isDefault: false },
        { size: "75cl", price: 32, isDefault: true }
      ],
      nutrition: { alcohol: 12 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "pétillant", "Loire"]
    },
    {
      name: "Champagne Laurent Perrier",
      description: "La Cuvée (Culture Raisonnée)",
      category: "wines_sparkling",
      subcategory: "champagne",
      priceVariants: [
        { size: "12.5cl", price: 12, isDefault: false },
        { size: "75cl", price: 70, isDefault: true }
      ],
      nutrition: { alcohol: 12 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["champagne", "premium"]
    }
  ],

  // COCKTAILS
  cocktails: [
    {
      name: "Bramble",
      description: "London Dry Gin, crème de mûre, citron vert, simple sirop",
      category: "cocktails",
      priceVariants: [{ size: "25cl", price: 10, isDefault: true }],
      nutrition: { alcohol: 20 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["signature", "fruité"],
      availability: {
        isAvailable: true,
        availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        availableTimeSlots: { lunch: false, dinner: true, allDay: false }
      }
    },
    {
      name: "Basil Smash",
      description: "Gin, basilic, citron vert, simple sirop",
      category: "cocktails",
      priceVariants: [{ size: "25cl", price: 10, isDefault: true }],
      nutrition: { alcohol: 22 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["fresh", "herbes"],
      availability: {
        isAvailable: true,
        availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        availableTimeSlots: { lunch: false, dinner: true, allDay: false }
      }
    },
    {
      name: "Expresso Martini",
      description: "Vodka, liqueur de café, shot d'espresso, simple sirop",
      category: "cocktails",
      priceVariants: [{ size: "25cl", price: 11, isDefault: true }],
      nutrition: { alcohol: 25 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["popular", "café"],
      availability: {
        isAvailable: true,
        availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        availableTimeSlots: { lunch: false, dinner: true, allDay: false }
      }
    },
    {
      name: "Porn Star Martini",
      description: "Vodka, Passoa, sirop de vanille, fruit de la passion, Vouvray pétillant",
      category: "cocktails",
      priceVariants: [{ size: "25cl", price: 12, isDefault: true }],
      nutrition: { alcohol: 18 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["signature", "exotique"],
      availability: {
        isAvailable: true,
        availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        availableTimeSlots: { lunch: false, dinner: true, allDay: false }
      }
    },
    {
      name: "Negroni Classico",
      description: "Gin, Campari, Vermouth Otto's",
      category: "cocktails",
      priceVariants: [{ size: "25cl", price: 11, isDefault: true }],
      nutrition: { alcohol: 28 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["classique", "amer"],
      availability: {
        isAvailable: true,
        availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        availableTimeSlots: { lunch: false, dinner: true, allDay: false }
      }
    }
  ],

  // MOCKTAILS
  mocktails: [
    {
      name: "Sweet Berry",
      description: "Vermouth Otto's, crème de framboise, Perrier, Peychaud bitter, citron vert, simple sirop",
      category: "mocktails",
      priceVariants: [{ size: "25cl", price: 10, isDefault: true }],
      nutrition: { alcohol: 0 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["sans alcool", "fruité"]
    },
    {
      name: "Tiki Boubou",
      description: "Tonka, ananas, orange, citron vert",
      category: "mocktails",
      priceVariants: [{ size: "25cl", price: 7, isDefault: true }],
      nutrition: { alcohol: 0 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["sans alcool", "tropical"]
    },
    {
      name: "Ginger Mojito",
      description: "Ginger beer, menthe, citron vert, sucre",
      category: "mocktails",
      priceVariants: [{ size: "25cl", price: 7, isDefault: true }],
      nutrition: { alcohol: 0 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: true, spicyLevel: 1 },
      tags: ["sans alcool", "fresh", "gingembre"]
    }
  ],

  // BIÈRES
  beers: [
    {
      name: "Stella Artois",
      description: "Bière blonde belge",
      category: "beers",
      subcategory: "pression",
      priceVariants: [
        { size: "25cl pression", price: 4, isDefault: true },
        { size: "50cl pression", price: 6.5, isDefault: false }
      ],
      nutrition: { alcohol: 5.2 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["pression", "belge"]
    },
    {
      name: "Deck & Donohue Mission Pale Ale",
      description: "Pale Ale artisanale (Bio)",
      category: "beers",
      subcategory: "artisanale",
      priceVariants: [
        { size: "25cl pression", price: 4.8, isDefault: true },
        { size: "33cl bouteille", price: 8.5, isDefault: false }
      ],
      nutrition: { alcohol: 4.8 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: false, isOrganic: true, isSpicy: false, spicyLevel: 0 },
      tags: ["bio", "artisanale", "pale ale"]
    },
    {
      name: "Demory Blanche",
      description: "Bière blanche artisanale",
      category: "beers",
      subcategory: "artisanale",
      priceVariants: [
        { size: "25cl pression", price: 5, isDefault: true },
        { size: "33cl bouteille", price: 9, isDefault: false }
      ],
      nutrition: { alcohol: 4.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["artisanale", "blanche"]
    },
    {
      name: "Brewdog Punk I.P.A",
      description: "IPA artisanale",
      category: "beers",
      subcategory: "IPA",
      priceVariants: [
        { size: "25cl pression", price: 5, isDefault: true },
        { size: "33cl bouteille", price: 9, isDefault: false }
      ],
      nutrition: { alcohol: 5.4 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["IPA", "artisanale", "houblonnée"]
    },
    {
      name: "Corona",
      description: "Bière blonde mexicaine",
      category: "beers",
      subcategory: "bouteille",
      priceVariants: [{ size: "33cl bouteille", price: 6.5, isDefault: true }],
      nutrition: { alcohol: 4.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["mexicaine", "lime"]
    },
    {
      name: "Corona 0%",
      description: "Bière sans alcool",
      category: "beers",
      subcategory: "sans alcool",
      priceVariants: [{ size: "33cl bouteille", price: 6.5, isDefault: true }],
      nutrition: { alcohol: 0 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: false, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["sans alcool", "healthy"]
    },
    {
      name: "Cidre Sassy",
      description: "Cidre artisanal français",
      category: "beers",
      subcategory: "cidre",
      priceVariants: [{ size: "33cl bouteille", price: 6.5, isDefault: true }],
      nutrition: { alcohol: 4.5 },
      dietary: { isVegetarian: true, isVegan: true, isGlutenFree: true, isOrganic: false, isSpicy: false, spicyLevel: 0 },
      tags: ["cidre", "français"]
    }
  ]
};

const seedMenuData = async () => {
  try {
    console.log('🚀 Initialisation du menu Pause Café complet...');
    
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
          displayOrder: i + 1,
          isActive: true,
          availability: items[i].availability || {
            isAvailable: true,
            availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
            availableTimeSlots: {
              lunch: true,
              dinner: true,
              allDay: true
            }
          }
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
    
    console.log('\n🎉 Menu Pause Café créé avec succès !');
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
    
    console.log('\n🔗 Testez votre API Menu Pause Café:');
    console.log('Tous les items: GET http://localhost:3000/api/menu');
    console.log('Items par catégorie: GET http://localhost:3000/api/menu?category=cocktails');
    console.log('Recherche: GET http://localhost:3000/api/menu/search?q=burger');
    console.log('Végétarien: GET http://localhost:3000/api/menu?isVegetarian=true');
    console.log('Catégories: GET http://localhost:3000/api/menu/categories');
    
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
  console.log('🎬 Lancement du script de création du menu Pause Café complet...');
  seedMenuData();
}

module.exports = seedMenuData;