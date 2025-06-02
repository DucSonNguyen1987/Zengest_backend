#!/bin/bash

# Script de diagnostic pour les tests de commandes
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔍 Diagnostic des tests de commandes - Zengest${NC}"
echo "================================================"

# 1. Vérifier si le serveur est démarré
echo -e "${BLUE}1. Vérification du serveur...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${API_URL}/health" 2>/dev/null)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Serveur accessible (HTTP $HTTP_CODE)${NC}"
    
    # Récupérer les infos du serveur
    HEALTH_RESPONSE=$(curl -s "${API_URL}/health" 2>/dev/null)
    if [[ $HEALTH_RESPONSE == *"success\":true"* ]]; then
        echo "   Version API: $(echo $HEALTH_RESPONSE | grep -o '"version":"[^"]*' | cut -d'"' -f4)"
        echo "   Environnement: $(echo $HEALTH_RESPONSE | grep -o '"environment":"[^"]*' | cut -d'"' -f4)"
        echo "   Base de données: $(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"
    fi
else
    echo -e "${RED}❌ Serveur non accessible (HTTP: $HTTP_CODE)${NC}"
    echo -e "${YELLOW}💡 Actions à effectuer:${NC}"
    echo "   1. Démarrez le serveur: npm start ou npm run dev"
    echo "   2. Vérifiez le port 3000"
    echo "   3. Vérifiez les logs du serveur"
    exit 1
fi

echo ""

# 2. Vérifier les utilisateurs disponibles
echo -e "${BLUE}2. Vérification des utilisateurs disponibles...${NC}"

# Tester avec l'admin d'abord
ADMIN_TEST=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@zengest.com",
    "password": "Admin123!"
  }' \
  "${API_URL}/auth/login" 2>/dev/null)

if [[ $ADMIN_TEST == *"success\":true"* ]]; then
    echo -e "${GREEN}✅ Admin accessible${NC}"
    ADMIN_TOKEN=$(echo $ADMIN_TEST | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    # Lister les utilisateurs avec le token admin
    USERS_RESPONSE=$(curl -s -X GET \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      "${API_URL}/users" 2>/dev/null)
    
    if [[ $USERS_RESPONSE == *"success\":true"* ]]; then
        echo "   📋 Utilisateurs disponibles:"
        
        # Extraire et afficher les emails des utilisateurs
        if command -v python3 &> /dev/null; then
            python3 -c "
import json
try:
    data = json.loads('''$USERS_RESPONSE''')
    users = data.get('data', {}).get('users', [])
    for user in users:
        email = user.get('email', 'N/A')
        role = user.get('role', 'N/A')
        active = user.get('isActive', False)
        status = '✅' if active else '❌'
        print(f'      {status} {email} ({role})')
except Exception as e:
    print(f'      Erreur parsing: {e}')
" 2>/dev/null
        else
            echo "      (Python3 non disponible pour parsing détaillé)"
            echo $USERS_RESPONSE | grep -o '"email":"[^"]*' | cut -d'"' -f4 | head -5
        fi
    else
        echo -e "${YELLOW}⚠️  Impossible de récupérer la liste des utilisateurs${NC}"
    fi
else
    echo -e "${RED}❌ Admin non accessible${NC}"
    echo -e "${YELLOW}💡 Les utilisateurs n'ont peut-être pas été créés${NC}"
    echo "   Lancez: npm run seed"
fi

echo ""

# 3. Test spécifique des utilisateurs staff
echo -e "${BLUE}3. Test des utilisateurs staff pour les commandes...${NC}"

STAFF_USERS=(
    "sophie.salle@bistrot-zengest.com:Staff123!"
    "pierre.bar@bistrot-zengest.com:Staff123!"
    "paul.cuisine@bistrot-zengest.com:Staff123!"
    "manager@bistrot-zengest.com:Manager123!"
)

for user_info in "${STAFF_USERS[@]}"; do
    IFS=':' read -r email password <<< "$user_info"
    
    STAFF_TEST=$(curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\"
      }" \
      "${API_URL}/auth/login" 2>/dev/null)
    
    if [[ $STAFF_TEST == *"success\":true"* ]]; then
        echo -e "${GREEN}   ✅ $email${NC}"
    else
        echo -e "${RED}   ❌ $email${NC}"
        echo "      Réponse: $(echo $STAFF_TEST | head -c 100)..."
    fi
done

echo ""

# 4. Vérifier les données nécessaires pour les commandes
echo -e "${BLUE}4. Vérification des données nécessaires...${NC}"

if [ ! -z "$ADMIN_TOKEN" ]; then
    # Vérifier les restaurants
    RESTAURANTS=$(curl -s -X GET \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      "${API_URL}/restaurants" 2>/dev/null)
    
    if [[ $RESTAURANTS == *"success\":true"* ]]; then
        REST_COUNT=$(echo $RESTAURANTS | grep -o '"_id":"[^"]*' | wc -l)
        echo -e "${GREEN}   ✅ Restaurants: $REST_COUNT${NC}"
    else
        echo -e "${RED}   ❌ Aucun restaurant trouvé${NC}"
    fi
    
    # Vérifier les plans de salle
    FLOOR_PLANS=$(curl -s -X GET \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      "${API_URL}/floor-plans" 2>/dev/null)
    
    if [[ $FLOOR_PLANS == *"success\":true"* ]]; then
        PLAN_COUNT=$(echo $FLOOR_PLANS | grep -o '"_id":"[^"]*' | wc -l)
        echo -e "${GREEN}   ✅ Plans de salle: $PLAN_COUNT${NC}"
    else
        echo -e "${RED}   ❌ Aucun plan de salle trouvé${NC}"
    fi
    
    # Vérifier le menu
    MENU=$(curl -s -X GET "${API_URL}/menu?limit=5" 2>/dev/null)
    
    if [[ $MENU == *"success\":true"* ]]; then
        MENU_COUNT=$(echo $MENU | grep -o '"_id":"[^"]*' | wc -l)
        echo -e "${GREEN}   ✅ Items de menu: $MENU_COUNT+${NC}"
    else
        echo -e "${RED}   ❌ Aucun item de menu trouvé${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Pas de token admin pour vérifier les données${NC}"
fi

echo ""

# 5. Recommandations
echo -e "${BLUE}5. Recommandations:${NC}"

if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${YELLOW}   🚀 Démarrez le serveur:${NC}"
    echo "      npm run dev"
    echo ""
fi

if [[ $ADMIN_TEST != *"success\":true"* ]]; then
    echo -e "${YELLOW}   📊 Initialisez les données:${NC}"
    echo "      npm run seed"
    echo ""
fi

if [[ $MENU != *"success\":true"* ]]; then
    echo -e "${YELLOW}   🍽️  Créez le menu:${NC}"
    echo "      npm run seed:menu"
    echo ""
fi

# Test final simple
echo -e "${BLUE}6. Test de connexion final...${NC}"
FINAL_TEST=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@bistrot-zengest.com",
    "password": "Manager123!"
  }' \
  "${API_URL}/auth/login" 2>/dev/null)

if [[ $FINAL_TEST == *"success\":true"* ]]; then
    echo -e "${GREEN}✅ Prêt pour les tests de commandes !${NC}"
    echo ""
    echo -e "${GREEN}🎯 Lancez maintenant:${NC}"
    echo "   npm run test:orders"
else
    echo -e "${RED}❌ Système pas encore prêt${NC}"
    echo -e "${YELLOW}💡 Suivez les recommandations ci-dessus${NC}"
fi

echo ""
echo "================================================"