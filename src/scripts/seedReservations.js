require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const FloorPlan = require('../models/FloorPlan');

const seedReservations = async () => {
  try {
    console.log('🎫 Initialisation des données de réservation...');
    
    // Connexion MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connexion MongoDB réussie');
    
    // Nettoyer les réservations existantes
    await Reservation.deleteMany({});
    console.log('✅ Réservations existantes supprimées');
    
    // Récupérer le restaurant de test
    const restaurant = await Restaurant.findOne({ name: 'Le Bistrot de Zengest' });
    if (!restaurant) {
      console.error('❌ Restaurant de test non trouvé. Exécutez d\'abord le seed principal.');
      process.exit(1);
    }
    
    // Récupérer un utilisateur manager pour créer les réservations
    const manager = await User.findOne({ 
      restaurantId: restaurant._id, 
      role: 'manager' 
    });
    
    if (!manager) {
      console.error('❌ Manager non trouvé. Exécutez d\'abord le seed principal.');
      process.exit(1);
    }
    
    // Récupérer le plan de salle par défaut
    const floorPlan = await FloorPlan.findOne({ 
      restaurantId: restaurant._id, 
      isDefault: true 
    });
    
    // Générer des réservations pour les 7 prochains jours
    const reservationsData = [];
    const today = new Date();
    
    // Noms de clients fictifs
    const customers = [
      { name: 'Marie Dubois', email: 'marie.dubois@example.com', phone: '+33123456780' },
      { name: 'Pierre Martin', email: 'pierre.martin@example.com', phone: '+33123456781' },
      { name: 'Sophie Bernard', email: 'sophie.bernard@example.com', phone: '+33123456782' },
      { name: 'Luc Moreau', email: 'luc.moreau@example.com', phone: '+33123456783' },
      { name: 'Emma Leroy', email: 'emma.leroy@example.com', phone: '+33123456784' },
      { name: 'Nicolas Roux', email: 'nicolas.roux@example.com', phone: '+33123456785' },
      { name: 'Julie Simon', email: 'julie.simon@example.com', phone: '+33123456786' },
      { name: 'Thomas Michel', email: 'thomas.michel@example.com', phone: '+33123456787' },
      { name: 'Céline Garcia', email: 'celine.garcia@example.com', phone: '+33123456788' },
      { name: 'Antoine Petit', email: 'antoine.petit@example.com', phone: '+33123456789' }
    ];
    
    // Demandes spéciales variées
    const specialRequests = [
      'Table près de la fenêtre',
      'Chaise haute pour bébé',
      'Zone non-fumeur',
      'Table calme',
      'Anniversaire - décoration',
      'Repas d\'affaires',
      'Table ronde si possible',
      'Accès handicapé',
      '',
      'Vue sur jardin'
    ];
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      // Éviter les réservations le dimanche (restaurant fermé)
      if (currentDate.getDay() === 0) continue;
      
      // Générer 3-8 réservations par jour
      const reservationsPerDay = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < reservationsPerDay; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        
        // Heures de réservation possibles (12h-14h et 19h-22h)
        const isLunch = Math.random() < 0.4; // 40% de chance d'être au déjeuner
        let hour, minute;
        
        if (isLunch) {
          hour = 12 + Math.floor(Math.random() * 2); // 12h ou 13h
          minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, ou 45 min
        } else {
          hour = 19 + Math.floor(Math.random() * 3); // 19h, 20h, ou 21h
          minute = Math.floor(Math.random() * 4) * 15;
        }
        
        const reservationDateTime = new Date(currentDate);
        reservationDateTime.setHours(hour, minute, 0, 0);
        
        // Éviter les réservations dans le passé
        if (reservationDateTime <= new Date()) {
          continue;
        }
        
        // Statuts variés selon la date
        let status;
        if (dayOffset === 0) { // Aujourd'hui
          const rand = Math.random();
          if (rand < 0.3) status = 'seated';
          else if (rand < 0.6) status = 'confirmed';
          else if (rand < 0.8) status = 'completed';
          else status = 'no_show';
        } else if (dayOffset === 1) { // Demain
          status = Math.random() < 0.9 ? 'confirmed' : 'cancelled';
        } else { // Jours suivants
          status = Math.random() < 0.8 ? 'confirmed' : 'pending';
        }
        
        const numberOfGuests = Math.floor(Math.random() * 8) + 1; // 1-8 convives
        const duration = isLunch ? 90 : 120; // Déjeuner plus court
        
        const reservationData = {
          restaurantId: restaurant._id,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            specialRequests: specialRequests[Math.floor(Math.random() * specialRequests.length)]
          },
          dateTime: reservationDateTime,
          duration,
          numberOfGuests,
          status,
          preferences: {
            seatingArea: Math.random() < 0.8 ? 'indoor' : 'outdoor',
            tableType: ['round', 'square', 'rectangle', 'no_preference'][Math.floor(Math.random() * 4)],
            accessibility: Math.random() < 0.1,
            quiet: Math.random() < 0.3
          },
          internalNotes: Math.random() < 0.3 ? 'Client VIP' : '',
          createdBy: manager._id
        };
        
        // Assigner une table pour certaines réservations confirmées
        if (floorPlan && ['confirmed', 'seated', 'completed'].includes(status) && Math.random() < 0.7) {
          const availableTables = floorPlan.tables.filter(table => 
            table.capacity >= numberOfGuests && table.isActive
          );
          
          if (availableTables.length > 0) {
            const selectedTable = availableTables[Math.floor(Math.random() * availableTables.length)];
            reservationData.assignedTable = {
              floorPlanId: floorPlan._id,
              tableId: selectedTable._id,
              tableNumber: selectedTable.number,
              assignedAt: new Date(reservationDateTime.getTime() - (24 * 60 * 60 * 1000)), // Assignée la veille
              assignedBy: manager._id
            };
          }
        }
        
        reservationsData.push(reservationData);
      }
    }
    
    // Créer les réservations en lot
    console.log(`📝 Création de ${reservationsData.length} réservations...`);
    const createdReservations = await Reservation.insertMany(reservationsData);
    
    // Statistiques
    const statusStats = {};
    createdReservations.forEach(res => {
      statusStats[res.status] = (statusStats[res.status] || 0) + 1;
    });
    
    console.log('\n📊 Réservations créées par statut:');
    Object.entries(statusStats).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // Créer quelques réservations avec conflits pour tester la gestion
    console.log('\n⚠️  Création de réservations de test avec conflits...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);
    
    try {
      // Réservation normale
      const reservation1 = await Reservation.create({
        restaurantId: restaurant._id,
        customer: {
          name: 'Client Test 1',
          email: 'test1@example.com',
          phone: '+33100000001'
        },
        dateTime: tomorrow,
        duration: 120,
        numberOfGuests: 4,
        status: 'confirmed',
        createdBy: manager._id
      });
      
      // Tentative de réservation en conflit (même heure)
      const conflictTime = new Date(tomorrow);
      conflictTime.setMinutes(30); // 30 min après
      
      const reservation2 = await Reservation.create({
        restaurantId: restaurant._id,
        customer: {
          name: 'Client Test 2',
          email: 'test2@example.com',
          phone: '+33100000002'
        },
        dateTime: conflictTime,
        duration: 120,
        numberOfGuests: 2,
        status: 'pending',
        createdBy: manager._id
      });
      
      console.log('✅ Réservations de test créées pour validation des conflits');
      
    } catch (error) {
      console.log('ℹ️  Conflits de réservation détectés (comportement attendu)');
    }
    
    await mongoose.connection.close();
    console.log('\n🎉 Données de réservation initialisées avec succès !');
    
    console.log('\n📋 Réservations de test créées:');
    console.log('🕐 Aujourd\'hui: Réservations en cours et terminées');
    console.log('🕑 Demain: Réservations confirmées (avec rappels)');
    console.log('🕒 Jours suivants: Mix de confirmées et en attente');
    console.log('📧 Emails de test prêts pour les notifications');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Fonction pour générer des réservations de test en temps réel
const generateLiveTestReservation = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    
    const restaurant = await Restaurant.findOne({ name: 'Le Bistrot de Zengest' });
    const manager = await User.findOne({ restaurantId: restaurant._id, role: 'manager' });
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 30, 0, 0);
    
    const testReservation = await Reservation.create({
      restaurantId: restaurant._id,
      customer: {
        name: 'Test Live',
        email: 'test.live@example.com',
        phone: '+33123456999'
      },
      dateTime: tomorrow,
      duration: 120,
      numberOfGuests: 2,
      status: 'confirmed',
      createdBy: manager._id
    });
    
    console.log('✅ Réservation de test live créée:', testReservation.reservationNumber);
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Erreur création réservation live:', error.message);
    process.exit(1);
  }
};

// Exécuter selon les arguments
if (process.argv[2] === 'live') {
  generateLiveTestReservation();
} else {
  seedReservations();
}