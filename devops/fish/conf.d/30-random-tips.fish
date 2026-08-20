function __register_tip_handler --on-event fish_prompt
  # Skip tips if previous command failed
  if test $status -ne 0
    echo (set_color red)"✗ Last command exited with non-zero code"(set_color normal) >&2
    return
  end

  # Skip tips on fish_greeting
  if not set -q __fish_greeting_shown
    set -g __fish_greeting_shown 1
    return
  end

  # Initialize the timestamp if needed
  if not set -q last_tip_time
    set -U last_tip_time 0
  end

  # Calculate time since last tip
  set -l current_time (date +%s)
  set -l elapsed_time (math $current_time - $last_tip_time)

  # Show tip if more than 5 minutes passed
  if test $elapsed_time -gt 300
    show_random_tip
  end
end
