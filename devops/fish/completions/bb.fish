function __bb_complete_tasks
  if not test "$__bb_tasks"
    # Parse the output to get task names with descriptions
    # Format: "taskname\tdescription" for fish completion
    # Skip tasks where description is just "Alias"
    set -g __bb_tasks (bb tasks | tail -n +3 | grep -v 'Alias$' | awk '{name=$1; $1=""; gsub(/^[ \t]+/, "", $0); gsub(/\[Essentials\]/, "", $0); print name "\t" $0}')
  end

  printf "%s\n" $__bb_tasks
end

complete -f -c bb -a "(__bb_complete_tasks)" -d 'tasks'
