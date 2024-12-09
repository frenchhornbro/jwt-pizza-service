echo "Running menuLoop.sh"
testCurlOutput() {
  if [ $? -ne 0 ]; then
    echo "A curl command in menuLoop.sh threw an error"
    exit 1
  fi
}
host=https://pizza-service.myfinancialbudgie.click
while true
 do
  curl -s $host/api/order/menu;
  testCurlOutput;
  sleep 3;
 done;
