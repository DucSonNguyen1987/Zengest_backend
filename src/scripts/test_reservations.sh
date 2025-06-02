#!/bin/bash

# Script de test pour l'API des réservations
# Utilisation: bash src/scripts/test_reservations.sh

BASE_URL="http://localhost:3000/api"
TOKEN=""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Test de l'API des réservations${NC}"
echo "=================================="

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Fonction pour connexion
login() {
    echo -e "\n${YELLOW}🔐 Connexion...${NC}"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "manager@bistrot-zengest.com",
            "password": "Manager123!"
        }')
    
    TOKEN=$(echo $RESPONSE | jq -r '.data.token')
    
    if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
        print_result 0 "Connexion réussie"
        return 0
    else
        print_result 1 "Échec de la connexion"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Test 1: Créer une réservation
test_create_reservation() {
    echo -e "\n${YELLOW}📝 Test 1: Créer une réservation${NC}"
    
    # Date demain à 19h30
    TOMORROW=$(date -d "tomorrow" +%Y-%m-%d)
    DATETIME="${TOMORROW}T19:30:00.000Z"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/reservations" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"customer\": {
                \"name\": \"Jean Dupont\",
                \"email\": \"jean.dupont@example.com\",
                \"phone\": \"+33123456789\",
                \"specialRequests\": \"Table près de la fenêtre\"
            },
            \"dateTime\": \"$DATETIME\",
            \"numberOfGuests\": 4,
            \"duration\": 120,
            \"preferences\": {
                \"seatingArea\": \"indoor\",
                \"quiet\": true
            }
        }")
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    RESERVATION_ID=$(echo $RESPONSE | jq -r '.data.reservation._id')
    RESERVATION_NUMBER=$(echo $RESPONSE | jq -r '.data.reservation.reservationNumber')
    
    if [ "$SUCCESS" = "true" ]; then
        print_result 0 "Réservation créée - ID: $RESERVATION_ID - Numéro: $RESERVATION_NUMBER"
        export RESERVATION_ID
        export RESERVATION_NUMBER
    else
        print_result 1 "Échec création réservation"
        echo "Response: $RESPONSE"
    fi
}

# Test 2: Récupérer la réservation
test_get_reservation() {
    echo -e "\n${YELLOW}📖 Test 2: Récupérer la réservation${NC}"
    
    if [ -z "$RESERVATION_ID" ]; then
        print_result 1 "Aucun ID de réservation disponible"
        return
    fi
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/reservations/$RESERVATION_ID" \
        -H "Authorization: Bearer $TOKEN")
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    CUSTOMER_NAME=$(echo $RESPONSE | jq -r '.data.reservation.customer.name')
    
    if [ "$SUCCESS" = "true" ] && [ "$CUSTOMER_NAME" = "Jean Dupont" ]; then
        print_result 0 "Réservation récupérée - Client: $CUSTOMER_NAME"
    else
        print_result 1 "Échec récupération réservation"
        echo "Response: $RESPONSE"
    fi
}

# Test 3: Mettre à jour la réservation
test_update_reservation() {
    echo -e "\n${YELLOW}✏️ Test 3: Mettre à jour la réservation${NC}"
    
    if [ -z "$RESERVATION_ID" ]; then
        print_result 1 "Aucun ID de réservation disponible"
        return
    fi
    
    RESPONSE=$(curl -s -X PUT "$BASE_URL/reservations/$RESERVATION_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "numberOfGuests": 6,
            "customer": {
                "specialRequests": "Table près de la fenêtre pour 6 personnes"
            }
        }')
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    NEW_GUESTS=$(echo $RESPONSE | jq -r '.data.reservation.numberOfGuests')
    
    if [ "$SUCCESS" = "true" ] && [ "$NEW_GUESTS" = "6" ]; then
        print_result 0 "Réservation mise à jour - Nouveaux convives: $NEW_GUESTS"
    else
        print_result 1 "Échec mise à jour réservation"
        echo "Response: $RESPONSE"
    fi
}

# Test 4: Changer le statut
test_update_status() {
    echo -e "\n${YELLOW}🔄 Test 4: Changer le statut en confirmé${NC}"
    
    if [ -z "$RESERVATION_ID" ]; then
        print_result 1 "Aucun ID de réservation disponible"
        return
    fi
    
    RESPONSE=$(curl -s -X PATCH "$BASE_URL/reservations/$RESERVATION_ID/status" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "status": "confirmed",
            "reason": "Confirmation automatique par test"
        }')
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    NEW_STATUS=$(echo $RESPONSE | jq -r '.data.reservation.status')
    
    if [ "$SUCCESS" = "true" ] && [ "$NEW_STATUS" = "confirmed" ]; then
        print_result 0 "Statut changé vers: $NEW_STATUS"
    else
        print_result 1 "Échec changement de statut"
        echo "Response: $RESPONSE"
    fi
}

# Test 5: Récupérer le plan de salle par défaut pour assigner une table
test_assign_table() {
    echo -e "\n${YELLOW}🪑 Test 5: Assigner une table${NC}"
    
    if [ -z "$RESERVATION_ID" ]; then
        print_result 1 "Aucun ID de réservation disponible"
        return
    fi
    
    # D'abord récupérer le plan de salle par défaut
    FLOORPLAN_RESPONSE=$(curl -s -X GET "$BASE_URL/floor-plans/default" \
        -H "Authorization: Bearer $TOKEN")
    
    FLOORPLAN_ID=$(echo $FLOORPLAN_RESPONSE | jq -r '.data.floorPlan._id')
    TABLE_ID=$(echo $FLOORPLAN_RESPONSE | jq -r '.data.floorPlan.tables[0]._id')
    TABLE_NUMBER=$(echo $FLOORPLAN_RESPONSE | jq -r '.data.floorPlan.tables[0].number')
    
    if [ "$FLOORPLAN_ID" != "null" ] && [ "$TABLE_ID" != "null" ]; then
        RESPONSE=$(curl -s -X PATCH "$BASE_URL/reservations/$RESERVATION_ID/assign-table" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"floorPlanId\": \"$FLOORPLAN_ID\",
                \"tableId\": \"$TABLE_ID\"
            }")
        
        SUCCESS=$(echo $RESPONSE | jq -r '.success')
        ASSIGNED_TABLE=$(echo $RESPONSE | jq -r '.data.tableInfo.number')
        
        if [ "$SUCCESS" = "true" ]; then
            print_result 0 "Table assignée: $ASSIGNED_TABLE"
        else
            print_result 1 "Échec assignation table"
            echo "Response: $RESPONSE"
        fi
    else
        print_result 1 "Aucun plan de salle ou table disponible"
    fi
}

# Test 6: Lister les réservations
test_list_reservations() {
    echo -e "\n${YELLOW}📋 Test 6: Lister les réservations${NC}"
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/reservations?limit=5&sortBy=dateTime&sortOrder=desc" \
        -H "Authorization: Bearer $TOKEN")
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    COUNT=$(echo $RESPONSE | jq -r '.data.reservations | length')
    
    if [ "$SUCCESS" = "true" ] && [ "$COUNT" -gt "0" ]; then
        print_result 0 "Réservations listées - Nombre: $COUNT"
    else
        print_result 1 "Échec liste réservations"
        echo "Response: $RESPONSE"
    fi
}

# Test 7: Recherche par date
test_search_by_date() {
    echo -e "\n${YELLOW}🔍 Test 7: Recherche par date${NC}"
    
    TOMORROW=$(date -d "tomorrow" +%Y-%m-%d)
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/reservations/date/$TOMORROW" \
        -H "Authorization: Bearer $TOKEN")
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    COUNT=$(echo $RESPONSE | jq -r '.data.reservations | length')
    
    if [ "$SUCCESS" = "true" ]; then
        print_result 0 "Recherche par date - Réservations trouvées: $COUNT"
    else
        print_result 1 "Échec recherche par date"
        echo "Response: $RESPONSE"
    fi
}

# Test 8: Annuler la réservation
test_cancel_reservation() {
    echo -e "\n${YELLOW}❌ Test 8: Annuler la réservation${NC}"
    
    if [ -z "$RESERVATION_ID" ]; then
        print_result 1 "Aucun ID de réservation disponible"
        return
    fi
    
    RESPONSE=$(curl -s -X PATCH "$BASE_URL/reservations/$RESERVATION_ID/status" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "status": "cancelled",
            "reason": "Test d'\''annulation"
        }')
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    
    if [ "$SUCCESS" = "true" ]; then
        print_result 0 "Réservation annulée"
    else
        print_result 1 "Échec annulation réservation"
        echo "Response: $RESPONSE"
    fi
}

# Vérifier que jq est installé
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq n'est pas installé. Installation requise: sudo apt-get install jq${NC}"
    exit 1
fi

# Vérifier que le serveur est accessible
echo -e "${YELLOW}🔍 Vérification de la connexion au serveur...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}❌ Serveur non accessible à $BASE_URL${NC}"
    echo "Assurez-vous que le serveur est démarré avec: npm run dev"
    exit 1
fi

# Exécuter tous les tests
login
test_create_reservation
test_get_reservation
test_update_reservation
test_update_status
test_assign_table
test_list_reservations
test_search_by_date
test_cancel_reservation

echo -e "\n${BLUE}🏁 Tests terminés${NC}"
echo "=================================="