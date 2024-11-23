echo "Running buyPizzaLoop.sh"
testCurlOutput() {
  if [ $? -ne 0 ]; then
    echo "A curl command in buyPizzaLoop.sh threw an error"
    exit 1
  fi
}
host=http://localhost:3000
while true
 do
   response=$(curl -s -X PUT $host/api/auth -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json');
   token=$(echo $response | jq -r '.token');
   curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H "Authorization: Bearer $token";
   testCurlOutput;
   sleep 20;
   curl -X DELETE $host/api/auth -H "Authorization: Bearer $token";
   testCurlOutput;
   sleep 30;
 done;