# Login as admin
host=http://localhost:3000
response=$(curl -s -X PUT $host/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json')
token=$(echo $response | jq -r '.token')

# Make purchase
curl -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.0383 }, { "menuId": 1, "description": "Veggie", "price": 0.0383 }]}'  -H "Authorization: Bearer $token"
curl -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.0383 }, { "menuId": 1, "description": "Veggie", "price": 0.0383 }]}'  -H "Authorization: Bearer $token"
curl -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.0383 }, { "menuId": 1, "description": "Veggie", "price": 0.0383 }]}'  -H "Authorization: Bearer $token"
curl -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.0383 }, { "menuId": 1, "description": "Veggie", "price": 0.0383 }]}'  -H "Authorization: Bearer $token"