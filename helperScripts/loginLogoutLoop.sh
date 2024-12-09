echo "Running loginLogoutLoop.sh"
testCurlOutput() {
  if [ $? -ne 0 ]; then
    echo "A curl command in loginLogoutLoop.sh threw an error"
    exit 1
  fi
}
host=https://pizza-service.myfinancialbudgie.click
while true
 do
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json');
  token=$(echo $response | jq -r '.token');
  sleep 110;
  curl -X DELETE $host/api/auth -H "Authorization: Bearer $token";
  testCurlOutput;
  sleep 10;
 done;
