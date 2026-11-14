#!/bin/sh
# Package the "paperfilm" skill: the guides in skill/paperfilm plus this project's code as its template.
# usage: sh tools/make_skill.sh [path/to/skill-creator]   -> skill/paperfilm.skill
set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)
SC=${1:-$(ls -d /root/.claude/skills/synced/*/skill-creator 2>/dev/null | head -1)}
STAGE="$ROOT/.cache/skill-stage"
rm -rf "$STAGE"
T="$STAGE/paperfilm/assets/template"
mkdir -p "$T/film" "$T/src" "$T/tools" "$T/assets"
cp -R skill/paperfilm/. "$STAGE/paperfilm/"
cp index.html README.md "$T/"
cp film/film.json "$T/film/"
cp src/*.js src/*.css "$T/src/"
cp tools/*.mjs tools/*.py tools/*.sh "$T/tools/"
cp assets/share.jpg assets/icon.png "$T/assets/"
# the soundtrack is rebuilt by tools/build_audio.py, so it stays out of the skill (7 MB)
cd "$SC" && python3 -m scripts.package_skill "$STAGE/paperfilm" "$ROOT/skill"
