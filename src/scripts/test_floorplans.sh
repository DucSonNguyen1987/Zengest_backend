#!/bin/bash

# Script de test pour les routes des plans de salle
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}🔍 $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Variables globales
TOKEN=""
PLAN_ID=""
TABLE_ID=""

echo -e "${BLUE}🚀 Tests des routes Floor Plans - Zengest${NC}"
echo "================================================"

# 1. Connexion pour obtenir un token
print_info "1. Connexion en tant que manager..."
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@bistrot-zengest.com",
    "password": "Manager123!"
  }' \
  "${API_URL}/auth/login")

if [[ $RESPONSE == *"success\":true"* ]]; then
    TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    print_result 0 "Connexion réussie"
    echo "Token: ${TOKEN:0:50}..."
else
    print_result 1 "Échec de la connexion"
    echo "Réponse: $RESPONSE"
    exit 1
fi

echo ""

# 2. Test de santé de l'API
print_info "2. Test de santé de l'API..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")
if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "API accessible (HTTP $HTTP_CODE)"
else
    print_result 1 "API non accessible (HTTP $HTTP_CODE)"
fi

echo ""

# 3. Récupération de tous les plans
print_info "3. Récupération de tous les plans de salle..."
RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "${API_URL}/floor-plans")

if [[ $RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Liste des plans récupérée"
    PLAN_COUNT=$(echo $RESPONSE | grep -o '"floorPlans":\[' | wc -l)
    echo "   Nombre de plans trouvés: $(echo $RESPONSE | grep -o '"_id"' | wc -l)"
    
    # Extraire le premier plan ID pour les tests suivants
    PLAN_ID=$(echo $RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "   Premier plan ID: $PLAN_ID"
else
    print_result 1 "Échec de récupération des plans"
    echo "Réponse: $RESPONSE"
fi

echo ""

# 4. Récupération du plan par défaut
print_info "4. Récupération du plan par défaut..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "${API_URL}/floor-plans/default")

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "Plan par défaut récupéré (HTTP $HTTP_CODE)"
else
    print_result 1 "Échec récupération plan par défaut (HTTP $HTTP_CODE)"
fi

echo ""

# 5. Récupération d'un plan spécifique
if [ ! -z "$PLAN_ID" ]; then
    print_info "5. Récupération du plan spécifique: $PLAN_ID"
    RESPONSE=$(curl -s -X GET \
      -H "Authorization: Bearer $TOKEN" \
      "${API_URL}/floor-plans/$PLAN_ID")

    if [[ $RESPONSE == *"success\":true"* ]]; then
        print_result 0 "Plan spécifique récupéré"
        
        # Extraire le premier table ID pour les tests suivants
        TABLE_ID=$(echo $RESPONSE | grep -o '"tables":\[{"_id":"[^"]*' | cut -d'"' -f6)
        if [ ! -z "$TABLE_ID" ]; then
            echo "   Premier table ID: $TABLE_ID"
        fi
    else
        print_result 1 "Échec récupération du plan spécifique"
        echo "Réponse: $RESPONSE"
    fi
else
    print_warning "5. Aucun plan ID disponible pour le test"
fi

echo ""

# 6. Test de création d'un nouveau plan
print_info "6. Création d'un nouveau plan de salle..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Plan API",
    "description": "Plan créé via script de test",
    "dimensions": {
      "width": 800,
      "height": 600,
      "unit": "cm"
    },
    "tables": [
      {
        "number": "T1",
        "capacity": 4,
        "shape": "square",
        "position": {"x": 200, "y": 200},
        "rotation": 0,
        "dimensions": {"width": 120, "height": 120},
        "status": "available"
      }
    ],
    "obstacles": [
      {
        "type": "wall",
        "name": "Mur test",
        "position": {"x": 0, "y": 0},
        "dimensions": {"width": 800, "height": 20},
        "rotation": 0,
        "color": "#8B4513",
        "isWalkable": false
      }
    ],
    "isActive": true,
    "isDefault": false
  }' \
  "${API_URL}/floor-plans")

if [[ $RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Nouveau plan créé avec succès"
    NEW_PLAN_ID=$(echo $RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "   Nouveau plan ID: $NEW_PLAN_ID"
else
    print_result 1 "Échec de création du plan"
    echo "Réponse: $RESPONSE"
fi

echo ""

# 7. Test de modification du statut d'une table
if [ ! -z "$PLAN_ID" ] && [ ! -z "$TABLE_ID" ]; then
    print_info "7. Modification du statut d'une table..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X PATCH \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "occupied"}' \
      "${API_URL}/floor-plans/$PLAN_ID/tables/$TABLE_ID/status")

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_result 0 "Statut de table modifié (HTTP $HTTP_CODE)"
    else
        print_result 1 "Échec modification statut table (HTTP $HTTP_CODE)"
    fi
else
    print_warning "7. Données insuffisantes pour test modification table"
fi

echo ""

# 8. Test des routes de debug
print_info "8. Test des routes de debug..."

# 8.1 User info
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "${API_URL}/floor-plans/debug/user-info")

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "Route debug user-info (HTTP $HTTP_CODE)"
else
    print_result 1 "Route debug user-info échoué (HTTP $HTTP_CODE)"
fi

# 8.2 Plan info
if [ ! -z "$PLAN_ID" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "${API_URL}/floor-plans/debug/plan-info/$PLAN_ID")

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_result 0 "Route debug plan-info (HTTP $HTTP_CODE)"
    else
        print_result 1 "Route debug plan-info échoué (HTTP $HTTP_CODE)"
    fi
fi

echo ""

# 9. Test d'export
if [ ! -z "$PLAN_ID" ]; then
    print_info "9. Test d'export de plan..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "${API_URL}/floor-plans/$PLAN_ID/export")

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_result 0 "Export du plan réussi (HTTP $HTTP_CODE)"
    else
        print_result 1 "Échec export du plan (HTTP $HTTP_CODE)"
    fi
else
    print_warning "9. Aucun plan ID pour test d'export"
fi

echo ""

# 10. Test de validation (données invalides)
print_info "10. Test de validation avec données invalides..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "dimensions": {
      "width": 50,
      "height": 50
    }
  }' \
  "${API_URL}/floor-plans")

if [[ $RESPONSE == *"success\":false"* ]]; then
    print_result 0 "Validation des erreurs fonctionne"
else
    print_result 1 "Validation des erreurs ne fonctionne pas"
fi

echo ""

# 11. Test avec utilisateur non autorisé
print_info "11. Test avec utilisateur staff (droits limités)..."
STAFF_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sophie.salle@bistrot-zengest.com",
    "password": "Staff123!"
  }' \
  "${API_URL}/auth/login")

if [[ $STAFF_RESPONSE == *"success\":true"* ]]; then
    STAFF_TOKEN=$(echo $STAFF_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    # Tenter de créer un plan avec un staff (devrait échouer)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name": "Test Staff", "dimensions": {"width": 500, "height": 500}}' \
      "${API_URL}/floor-plans")

    if [ "$HTTP_CODE" -eq 403 ]; then
        print_result 0 "Contrôle d'accès staff fonctionne (HTTP $HTTP_CODE)"
    else
        print_result 1 "Contrôle d'accès staff défaillant (HTTP $HTTP_CODE)"
    fi
else
    print_warning "11. Impossible de se connecter en tant que staff"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🏁 Tests terminés !${NC}"
echo ""
echo "Pour lancer ce script:"
echo "1. Sauvegardez-le dans un fichier: test_floorplans.sh"
echo "2. Rendez-le exécutable: chmod +x test_floorplans.sh"
echo "3. Lancez-le: ./test_floorplans.sh"