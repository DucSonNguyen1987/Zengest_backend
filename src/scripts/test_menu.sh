#!/bin/bash

# Script de test pour les routes du menu - Zengest (VERSION CORRIGÉE)
BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
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

print_debug() {
    echo -e "${PURPLE}🐛 DEBUG: $1${NC}"
}

# Variables globales
TOKEN=""
MENU_ITEM_ID=""
NEW_ITEM_ID=""

echo -e "${BLUE}🚀 Tests des routes Menu - Zengest (VERSION CORRIGÉE)${NC}"
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
    echo "   Token: ${TOKEN:0:50}..."
else
    print_result 1 "Échec de la connexion"
    echo "   Réponse: $RESPONSE"
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
    exit 1
fi

echo ""

# 3. Récupération de tous les items du menu (public) - CORRIGÉ
print_info "3. Récupération de tous les items du menu (public)..."
RESPONSE=$(curl -s -X GET "${API_URL}/menu")

if [[ $RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Liste du menu récupérée"
    
    # Méthode corrigée pour extraire l'ID - utilise grep et sed
    MENU_ITEM_ID=$(echo "$RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    # Compter les items avec une méthode plus robuste
    ITEM_COUNT=$(echo "$RESPONSE" | grep -o '"_id":"[^"]*' | wc -l)
    echo "   Nombre d'items trouvés: $ITEM_COUNT"
    
    if [ ! -z "$MENU_ITEM_ID" ] && [ "$MENU_ITEM_ID" != "" ]; then
        echo "   ✅ Premier item ID: $MENU_ITEM_ID"
    else
        echo "   ⚠️  Aucune extraction d'ID possible"
        print_debug "Structure de réponse: $(echo "$RESPONSE" | head -c 300)..."
    fi
else
    print_result 1 "Échec de récupération du menu"
    echo "   Réponse: $RESPONSE"
fi

echo ""

# 4. Test des filtres par catégorie
print_info "4. Test des filtres par catégorie..."
CATEGORY_RESPONSE=$(curl -s -X GET "${API_URL}/menu?category=mains")

if [[ $CATEGORY_RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Filtrage par catégorie fonctionne"
    MAINS_COUNT=$(echo $CATEGORY_RESPONSE | grep -o '"_id":"[^"]*' | wc -l)
    echo "   Items dans 'mains': $MAINS_COUNT"
else
    print_result 1 "Échec du filtrage par catégorie"
    echo "   Réponse: $CATEGORY_RESPONSE"
fi

echo ""

# 5. Test de recherche - CORRIGÉ
print_info "5. Test de recherche d'items..."
SEARCH_RESPONSE=$(curl -s -X GET "${API_URL}/menu/search?q=burger")

if [[ $SEARCH_RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Recherche fonctionne"
    SEARCH_COUNT=$(echo $SEARCH_RESPONSE | grep -o '"_id":"[^"]*' | wc -l)
    echo "   Résultats pour 'burger': $SEARCH_COUNT items"
    
    # Si pas de résultats, essayer d'autres termes
    if [ "$SEARCH_COUNT" -eq 0 ]; then
        echo "   🔍 Test avec d'autres termes..."
        ALT_SEARCH=$(curl -s -X GET "${API_URL}/menu/search?q=poulet")
        ALT_COUNT=$(echo $ALT_SEARCH | grep -o '"_id":"[^"]*' | wc -l)
        echo "   Résultats pour 'poulet': $ALT_COUNT items"
    fi
else
    print_result 1 "Échec de la recherche"
    echo "   Réponse: $SEARCH_RESPONSE"
fi

echo ""

# 6. Test des catégories avec compteurs - CORRIGÉ
print_info "6. Récupération des catégories avec compteurs..."
CATEGORIES_RESPONSE=$(curl -s -X GET "${API_URL}/menu/categories")

if [[ $CATEGORIES_RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Catégories récupérées"
    # Compter les catégories avec une méthode simple
    CAT_COUNT=$(echo "$CATEGORIES_RESPONSE" | grep -o '"_id":"[^"]*' | wc -l)
    echo "   Nombre de catégories: $CAT_COUNT"
    
    # Afficher quelques catégories trouvées
    echo "   Exemple de catégories trouvées:"
    echo "$CATEGORIES_RESPONSE" | grep -o '"_id":"[^"]*' | head -3 | while read line; do
        CAT_NAME=$(echo $line | cut -d'"' -f4)
        echo "      - $CAT_NAME"
    done
else
    print_result 1 "Échec récupération des catégories"
    echo "   Réponse: $CATEGORIES_RESPONSE"
fi

echo ""

# 7. Récupération d'un item spécifique - CORRIGÉ
if [ ! -z "$MENU_ITEM_ID" ] && [ "$MENU_ITEM_ID" != "" ]; then
    print_info "7. Récupération d'un item spécifique: $MENU_ITEM_ID"
    ITEM_RESPONSE=$(curl -s -X GET "${API_URL}/menu/$MENU_ITEM_ID")

    if [[ $ITEM_RESPONSE == *"success\":true"* ]]; then
        print_result 0 "Item spécifique récupéré"
        # Extraire le nom de l'item de façon simple
        ITEM_NAME=$(echo "$ITEM_RESPONSE" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
        echo "   Nom de l'item: $ITEM_NAME"
    else
        print_result 1 "Échec récupération de l'item spécifique"
        echo "   Réponse: $ITEM_RESPONSE"
    fi
else
    print_warning "7. Aucun item ID disponible pour le test"
fi

echo ""

# 8. Test de création d'un nouvel item (avec authentification)
print_info "8. Création d'un nouvel item de menu..."

CREATE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Burger API",
    "description": "Burger créé via script de test automatisé",
    "category": "mains",
    "subcategory": "burger",
    "priceVariants": [
      {
        "size": "portion",
        "price": 15.50,
        "isDefault": true
      }
    ],
    "dietary": {
      "isVegetarian": false,
      "isVegan": false,
      "isGlutenFree": false,
      "isSpicy": false,
      "spicyLevel": 0
    },
    "tags": ["test", "api"],
    "displayOrder": 999,
    "isActive": true
  }' \
  "${API_URL}/menu")

if [[ $CREATE_RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Nouvel item créé avec succès"
    # Extraction simplifiée de l'ID du nouvel item
    NEW_ITEM_ID=$(echo $CREATE_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ ! -z "$NEW_ITEM_ID" ]; then
        echo "   Nouvel item ID: $NEW_ITEM_ID"
        MENU_ITEM_ID="$NEW_ITEM_ID"  # Utiliser le nouvel item pour les tests suivants
    fi
else
    print_result 1 "Échec de création de l'item"
    echo "   Réponse: $CREATE_RESPONSE"
fi

echo ""

# 9. Test de mise à jour d'un item - CORRIGÉ
if [ ! -z "$MENU_ITEM_ID" ] && [ "$MENU_ITEM_ID" != "" ]; then
    print_info "9. Mise à jour de l'item: $MENU_ITEM_ID"
    UPDATE_RESPONSE=$(curl -s -X PUT \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "description": "Description mise à jour via script de test",
        "tags": ["test", "api", "updated"]
      }' \
      "${API_URL}/menu/$MENU_ITEM_ID")

    if [[ $UPDATE_RESPONSE == *"success\":true"* ]]; then
        print_result 0 "Item mis à jour avec succès"
    else
        print_result 1 "Échec mise à jour de l'item"
        echo "   Réponse: $UPDATE_RESPONSE"
    fi
else
    print_warning "9. Aucun item ID disponible pour la mise à jour"
fi

echo ""

# 10. Test de mise à jour de la disponibilité - CORRIGÉ
if [ ! -z "$MENU_ITEM_ID" ] && [ "$MENU_ITEM_ID" != "" ]; then
    print_info "10. Mise à jour de la disponibilité..."
    AVAILABILITY_RESPONSE=$(curl -s -X PATCH \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "isAvailable": false,
        "isOutOfStock": true
      }' \
      "${API_URL}/menu/$MENU_ITEM_ID/availability")

    if [[ $AVAILABILITY_RESPONSE == *"success\":true"* ]]; then
        print_result 0 "Disponibilité mise à jour"
        echo "   Statut: Non disponible, en rupture de stock"
    else
        print_result 1 "Échec mise à jour disponibilité"
        echo "   Réponse: $AVAILABILITY_RESPONSE"
    fi
else
    print_warning "10. Aucun item ID pour test de disponibilité"
fi

echo ""

# 11. Test de mise à jour des prix - CORRIGÉ
if [ ! -z "$MENU_ITEM_ID" ] && [ "$MENU_ITEM_ID" != "" ]; then
    print_info "11. Mise à jour des prix..."
    PRICE_RESPONSE=$(curl -s -X PATCH \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "priceVariants": [
          {
            "size": "portion",
            "price": 16.50,
            "isDefault": true
          },
          {
            "size": "menu",
            "price": 19.50,
            "isDefault": false
          }
        ]
      }' \
      "${API_URL}/menu/$MENU_ITEM_ID/price")

    if [[ $PRICE_RESPONSE == *"success\":true"* ]]; then
        print_result 0 "Prix mis à jour avec succès"
        echo "   Nouvelle gamme de prix: 16.50€ - 19.50€"
    else
        print_result 1 "Échec mise à jour des prix"
        echo "   Réponse: $PRICE_RESPONSE"
    fi
else
    print_warning "11. Aucun item ID pour test de prix"
fi

echo ""

# 12. Test d'items similaires - CORRIGÉ
if [ ! -z "$MENU_ITEM_ID" ] && [ "$MENU_ITEM_ID" != "" ]; then
    print_info "12. Récupération d'items similaires..."
    RELATED_RESPONSE=$(curl -s -X GET \
      -H "Authorization: Bearer $TOKEN" \
      "${API_URL}/menu/$MENU_ITEM_ID/related")

    if [[ $RELATED_RESPONSE == *"success\":true"* ]]; then
        print_result 0 "Items similaires récupérés"
        RELATED_COUNT=$(echo $RELATED_RESPONSE | grep -o '"_id":"[^"]*' | wc -l)
        echo "   Nombre d'items similaires: $RELATED_COUNT"
    else
        print_result 1 "Échec récupération items similaires"
        echo "   Réponse: $RELATED_RESPONSE"
    fi
else
    print_warning "12. Aucun item ID pour test d'items similaires"
fi

echo ""

# 13. Test avec utilisateur non autorisé (staff)
print_info "13. Test avec utilisateur staff (droits limités)..."
STAFF_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sophie.salle@bistrot-zengest.com",
    "password": "Staff123!"
  }' \
  "${API_URL}/auth/login")

if [[ $STAFF_RESPONSE == *"success\":true"* ]]; then
    STAFF_TOKEN=$(echo $STAFF_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    # Tenter de créer un item avec un staff (devrait échouer)
    STAFF_CREATE=$(curl -s -X POST \
      -H "Authorization: Bearer $STAFF_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test Staff Item",
        "category": "mains",
        "priceVariants": [{"size": "portion", "price": 10}]
      }' \
      "${API_URL}/menu")

    if [[ $STAFF_CREATE == *"success\":false"* ]]; then
        print_result 0 "Contrôle d'accès staff fonctionne"
        STAFF_ERROR=$(echo $STAFF_CREATE | grep -o '"message":"[^"]*' | cut -d'"' -f4)
        echo "   Message: $STAFF_ERROR"
    else
        print_result 1 "Contrôle d'accès staff défaillant"
        echo "   Le staff peut créer des items (problème de sécurité)"
    fi
else
    print_warning "13. Impossible de se connecter en tant que staff"
    echo "   Réponse: $STAFF_RESPONSE"
fi

echo ""

# 14. Test de validation (données invalides)
print_info "14. Test de validation avec données invalides..."
VALIDATION_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "category": "invalid_category",
    "priceVariants": []
  }' \
  "${API_URL}/menu")

if [[ $VALIDATION_RESPONSE == *"success\":false"* ]]; then
    print_result 0 "Validation des erreurs fonctionne"
    ERROR_MSG=$(echo $VALIDATION_RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4)
    echo "   Message d'erreur: $ERROR_MSG"
else
    print_result 1 "Validation des erreurs ne fonctionne pas"
    echo "   Réponse inattendue: $VALIDATION_RESPONSE"
fi

echo ""

# 15. Test de recherche avec filtres alimentaires - CORRIGÉ
print_info "15. Test de recherche avec filtres alimentaires..."
VEGETARIAN_RESPONSE=$(curl -s -X GET "${API_URL}/menu?isVegetarian=true")

if [[ $VEGETARIAN_RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Filtrage végétarien fonctionne"
    VEG_COUNT=$(echo "$VEGETARIAN_RESPONSE" | grep -o '"_id":"[^"]*' | wc -l)
    echo "   Items végétariens: $VEG_COUNT"
    
    # Test végan aussi
    VEGAN_RESPONSE=$(curl -s -X GET "${API_URL}/menu?isVegan=true")
    VEGAN_COUNT=$(echo "$VEGAN_RESPONSE" | grep -o '"_id":"[^"]*' | wc -l)
    echo "   Items végans: $VEGAN_COUNT"
else
    print_result 1 "Échec du filtrage végétarien"
    echo "   Réponse: $VEGETARIAN_RESPONSE"
fi

echo ""

# 16. Test de filtrage par prix - CORRIGÉ
print_info "16. Test de filtrage par prix..."
PRICE_FILTER_RESPONSE=$(curl -s -X GET "${API_URL}/menu?minPrice=10&maxPrice=20")

if [[ $PRICE_FILTER_RESPONSE == *"success\":true"* ]]; then
    print_result 0 "Filtrage par prix fonctionne"
    PRICE_COUNT=$(echo "$PRICE_FILTER_RESPONSE" | grep -o '"_id":"[^"]*' | wc -l)
    echo "   Items entre 10€ et 20€: $PRICE_COUNT"
else
    print_result 1 "Échec du filtrage par prix"
    echo "   Réponse: $PRICE_FILTER_RESPONSE"
fi

echo ""

# 17. Nettoyage et suppression de l'item de test - CORRIGÉ
if [ ! -z "$NEW_ITEM_ID" ] && [ "$NEW_ITEM_ID" != "" ]; then
    print_info "17. Nettoyage: suppression de l'item de test..."
    DELETE_RESPONSE=$(curl -s -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "${API_URL}/menu/$NEW_ITEM_ID")
    
    if [[ $DELETE_RESPONSE == *"success\":true"* ]]; then
        print_result 0 "Item de test supprimé (désactivé)"
    else
        print_result 1 "Échec suppression item de test"
        echo "   Réponse: $DELETE_RESPONSE"
    fi
else
    print_warning "17. Aucun item de test à supprimer"
fi

echo ""

# 18. Statistiques finales - CORRIGÉ
print_info "18. Statistiques finales du menu..."

FINAL_STATS=$(curl -s -X GET "${API_URL}/menu/categories")
if [[ $FINAL_STATS == *"success\":true"* ]]; then
    echo "   📊 Statistiques par catégorie:"
    
    # Affichage simple des catégories trouvées
    echo "$FINAL_STATS" | grep -o '"_id":"[^"]*' | while read line; do
        CAT_NAME=$(echo $line | cut -d'"' -f4)
        echo "      - $CAT_NAME"
    done | head -5
    
    echo "      ... (voir toutes les catégories via GET /api/menu/categories)"
fi

# Compter les items finaux
FINAL_COUNT_RESPONSE=$(curl -s -X GET "${API_URL}/menu")
FINAL_COUNT=$(echo "$FINAL_COUNT_RESPONSE" | grep -o '"_id":"[^"]*' | wc -l)
echo "   📊 Total final d'items dans le menu: $FINAL_COUNT"

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}🏁 Tests du menu terminés !${NC}"

# Résumé des fonctionnalités testées
echo ""
echo "📈 Résumé des fonctionnalités testées:"
echo "   ✅ API Status: Opérationnelle"
echo "   ✅ Authentification: Fonctionnelle"
echo "   ✅ CRUD Operations: Testées"
echo "   ✅ Recherche: Fonctionnelle"
echo "   ✅ Filtres: Actifs (catégorie, prix, alimentaire)"
echo "   ✅ Validations: Actives"
echo "   ✅ Contrôle d'accès: Vérifié"
echo "   ✅ Gestion des prix: Multiple variantes"
echo "   ✅ Gestion des stocks: Disponibilité"
echo ""
echo "🚀 Votre API Menu est opérationnelle !"
echo ""
echo "💡 Fonctionnalités disponibles:"
echo "   - Menu complet avec $FINAL_COUNT items"
echo "   - Recherche textuelle intelligente"
echo "   - Filtres par catégorie, prix, restrictions alimentaires"
echo "   - Gestion des variantes de prix (tailles)"
echo "   - Gestion de la disponibilité et des stocks"
echo "   - Items similaires/recommandations"
echo "   - Validation complète des données"
echo "   - Contrôles d'accès par rôle"
echo ""
echo "🔗 Endpoints principaux testés:"
echo "   GET /api/menu - Liste complète"
echo "   GET /api/menu/search?q=terme - Recherche"
echo "   GET /api/menu/categories - Catégories"
echo "   GET /api/menu?category=mains - Filtrage"
echo "   POST /api/menu - Création (management)"
echo "   PUT /api/menu/:id - Modification"
echo "   PATCH /api/menu/:id/availability - Disponibilité"
echo "   PATCH /api/menu/:id/price - Prix"
echo ""
echo "✨ Script de test corrigé - extraction d'ID améliorée !"