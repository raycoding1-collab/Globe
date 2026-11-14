#!/bin/sh
# Publish the film to GitHub Pages: https://raycoding1-collab.github.io/Globe/
# Copies the website files onto the gh-pages branch and pushes it. Run from anywhere.
set -e
cd "$(dirname "$0")/.."
DIR=.cache/site
git fetch -q origin gh-pages
if ! git -C "$DIR" rev-parse --git-dir >/dev/null 2>&1; then git worktree prune; git worktree add -q "$DIR" gh-pages; fi
git -C "$DIR" checkout -q gh-pages
git -C "$DIR" reset -q --hard origin/gh-pages
git -C "$DIR" rm -rq --ignore-unmatch src assets
mkdir -p "$DIR/src" "$DIR/assets/audio"
cp index.html "$DIR/"
cp src/*.js src/*.css "$DIR/src/"
cp assets/audio/film.mp3 "$DIR/assets/audio/"
cp assets/share.jpg assets/icon.png "$DIR/assets/"
touch "$DIR/.nojekyll"
git -C "$DIR" add -A
if git -C "$DIR" diff --cached --quiet; then echo "GitHub Pages already up to date"; exit 0; fi
git -C "$DIR" commit -q -m "Publish the film from $(git rev-parse --short HEAD)"
git -C "$DIR" push -q origin gh-pages
echo "Published to https://raycoding1-collab.github.io/Globe/"
