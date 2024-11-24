# Kill all background processes on CTRL-C
cleanup() {
    echo "Exiting..."
    kill 0
    exit
}
trap cleanup SIGINT

# Kill all background processes on errors
handleSigChld() {
    echo "Error thrown, exiting..."
    kill 0
    exit
}
trap handleSigChld SIGCHLD

# Repeatedly run curl commands in while loops as background processes.
./menuLoop.sh &
./invalidLoginLoop.sh &
./loginLogoutLoop.sh &
./buyPizzaLoop.sh &

# Wait for the background processes to complete
wait