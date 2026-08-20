function help --description 'Instructions how to use project'
  echo ''
  echo 'All tasks:'
  echo '=========='
  bb tasks | rg -v 'are available' | rg -v 'Alias'

  echo ''
  echo 'Essential tasks:'
  echo '================'
  bb tasks | rg 'Essentials' | sed 's/\[Essentials\]//g'

  echo ''
  echo 'Shortcuts:'
  echo '=========='
  bb tasks | rg 'Shortcut' | sed 's/Shortcut for\s*//g'

  echo ''
  echo 'Usage:'
  echo '======'
  echo 'Use `bb [task]` to run project tasks.'
  echo 'Examples: `bb build` / `bb ci` / `bb deploy:dev`'

  echo ''
  echo 'See README.md and DEVELOPMENT.md for more details.'
end
