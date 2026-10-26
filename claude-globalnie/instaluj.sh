#!/usr/bin/env bash
# Instaluje globalne ustawienia Claude Code Tymona do ~/.claude/ — dzialaja
# potem w KAZDYM projekcie na tym komputerze / w tym kontenerze:
#   ~/.claude/CLAUDE.md                     ustalenia (blok miedzy znacznikami)
#   ~/.claude/skills/frontend-design/       skill Anthropic (Apache 2.0)
#   ~/.claude/skills/kontrola-wygladu/      zrzuty ekranu + raport bledow
#
# Uruchom jedno z dwoch:
#   curl -fsSL https://raw.githubusercontent.com/Warzywko123/techgrow-studio/main/claude-globalnie/instaluj.sh | bash
#   bash claude-globalnie/instaluj.sh       # z klona repo (bierze pliki z dysku)
#
# Mozna odpalac wielokrotnie: skille sa nadpisywane, a w CLAUDE.md podmieniany
# jest tylko nasz blok — reszta pliku zostaje nietknieta.
set -euo pipefail

ZRODLO="${ZRODLO:-https://raw.githubusercontent.com/Warzywko123/techgrow-studio/main/claude-globalnie}"
CEL="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
PLIKI=(
  CLAUDE.md
  skills/frontend-design/SKILL.md
  skills/frontend-design/LICENSE.txt
  skills/kontrola-wygladu/SKILL.md
  skills/kontrola-wygladu/zrzuty.js
)

# Uruchomiony z pliku w repo -> bierzemy pliki z dysku; przez curl | bash -> z GitHuba.
LOKALNIE=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/CLAUDE.md" ]; then
  LOKALNIE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Najpierw wszystko pobieramy, dopiero potem podmieniamy — przerwane pobieranie
# nie zostawi polowy instalacji.
for p in "${PLIKI[@]}"; do
  mkdir -p "$TMP/$(dirname "$p")"
  if [ -n "$LOKALNIE" ]; then
    cp "$LOKALNIE/$p" "$TMP/$p"
  else
    curl -fsSL "$ZRODLO/$p" -o "$TMP/$p"
  fi
done

for s in frontend-design kontrola-wygladu; do
  rm -rf "$CEL/skills/$s"
  mkdir -p "$CEL/skills"
  cp -R "$TMP/skills/$s" "$CEL/skills/$s"
done

START='<!-- ustalenia-tymona:start (instaluj.sh nadpisuje ten blok) -->'
KONIEC='<!-- ustalenia-tymona:koniec -->'
mkdir -p "$CEL"
touch "$CEL/CLAUDE.md"
# Usun stary blok (jesli jest), dopisz aktualny na koniec.
# Puste linie na koncu tez wylatuja, zeby kolejne instalacje ich nie mnozyly.
awk -v s="$START" -v k="$KONIEC" '
  $0 == s { pomin = 1; next }
  $0 == k { pomin = 0; next }
  pomin { next }
  /^[[:space:]]*$/ { puste = puste $0 "\n"; next }
  { printf "%s%s\n", puste, $0; puste = "" }
' "$CEL/CLAUDE.md" > "$TMP/stary.md"
{
  cat "$TMP/stary.md"
  [ -s "$TMP/stary.md" ] && echo
  echo "$START"
  cat "$TMP/CLAUDE.md"
  echo "$KONIEC"
} > "$CEL/CLAUDE.md"

echo "Zainstalowano w $CEL: CLAUDE.md, skills/frontend-design, skills/kontrola-wygladu"
