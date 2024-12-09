echo "Running invalidLoginLoop.sh"
testCurlOutput() {
  if [ $? -ne 0 ]; then
    echo "A curl command in invalidLoginLoop.sh threw an error"
    exit 1
  fi
}
host=https://pizza-service.myfinancialbudgie.click
while true
 do
  curl -s -X PUT $host/api/auth -d '{"email":"unknown@jwt.com", "password":"bad"}' -H 'Content-Type: application/json';
  testCurlOutput;
  sleep 25;
 done;
