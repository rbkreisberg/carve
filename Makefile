#cribbed from d3

GENERATED_FILES = \
	carve.js \
	carve.min.js \
	bower.json \
	component.json

all: $(GENERATED_FILES)

.PHONY: clean all test

src/semver.js: package.json bin/semver
	bin/semver > $@

carve.js: $(shell node_modules/.bin/smash --ignore-missing --list src/carve.js) package.json
	@rm -f $@
	node_modules/.bin/smash src/carve.js | node_modules/.bin/uglifyjs - -b indent-level=2 -o $@
	@chmod a-w $@

carve.min.js: carve.js bin/uglify
	@rm -f $@
	bin/uglify $< > $@

%.json: bin/% package.json
	@rm -f $@
	bin/$* > $@
	@chmod a-w $@

clean:
	rm -f -- $(GENERATED_FILES)