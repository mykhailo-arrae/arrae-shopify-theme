gulp: script -qec gulp
lint: ./devops/bin/lint-watch.sh
swc: script -qec ./devops/bin/watch-ts.sh
rspack: script -qec 'sleep 0.2 && while [ ! -f _js-dist/.swc-ready ]; do sleep 0.2; done && node ./devops/lib/webpack/run.js --watch'
