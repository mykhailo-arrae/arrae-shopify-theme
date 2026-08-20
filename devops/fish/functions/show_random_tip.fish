function show_random_tip
  # Array of tips
  set tips \
    "Tip: Use 'bb ca' command to instantly commit all build artifacts." \
    "Tip: Use 'bb ci' command to run all project tests and checks."

  # Get a random tip
  set -l random_index (random 1 (count $tips))
  echo $tips[$random_index]

  # Update timestamp
  set -U last_tip_time (date +%s)
end
