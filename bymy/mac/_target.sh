# Közös: Bymy web célmappa — CSAK Letöltések/bymy web
# shellcheck shell=bash

bymy_letoltes_root() {
  if [ -d "${HOME}/Letöltések" ]; then
    echo "${HOME}/Letöltések"
  elif [ -d "${HOME}/Downloads" ]; then
    echo "${HOME}/Downloads"
  else
    mkdir -p "${HOME}/Letöltések"
    echo "${HOME}/Letöltések"
  fi
}

# Kanonikus név: "bymy web" (nem bocsa-app, nem sima bymy)
bymy_web_dirname() {
  echo "bymy web"
}

# Meglévő telepítés felismerése + új cél.
bymy_target() {
  local root
  root="$(bymy_letoltes_root)"
  local want="${root}/$(bymy_web_dirname)"

  # 1) Már létezik a helyes mappa
  if [ -d "$want" ]; then
    echo "$want"
    return
  fi

  # 2) Régi nevek → átirányítás a helyesre (másoláskor a telepítő migrál)
  for name in "bymy web" bymy autosweb; do
    if [ -d "${root}/${name}" ]; then
      echo "${root}/${name}"
      return
    fi
  done
  if [ -d "${HOME}/Downloads/bymy web" ]; then
    echo "${HOME}/Downloads/bymy web"
    return
  fi
  if [ -d "${HOME}/Letöltések/bymy web" ]; then
    echo "${HOME}/Letöltések/bymy web"
    return
  fi
  if [ -d "${HOME}/Downloads/bymy" ]; then
    echo "${HOME}/Downloads/bymy"
    return
  fi
  if [ -d "${HOME}/Letöltések/bymy" ]; then
    echo "${HOME}/Letöltések/bymy"
    return
  fi

  # 3) Új telepítés ide megy
  echo "$want"
}

# Mindig a kanonikus cél (telepítés / frissítés ide írjon)
bymy_canonical_target() {
  echo "$(bymy_letoltes_root)/$(bymy_web_dirname)"
}
