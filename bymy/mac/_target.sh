# Közös: Bymy célmappa (magyar Mac: Letöltések)
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

# Meglévő telepítés: bymy, vagy régi autosweb mappa (adatvesztés nélkül).
bymy_target() {
  local root
  root="$(bymy_letoltes_root)"
  for name in bymy autosweb; do
    if [ -d "${root}/${name}" ]; then
      echo "${root}/${name}"
      return
    fi
  done
  if [ -d "${HOME}/Downloads/bymy" ]; then
    echo "${HOME}/Downloads/bymy"
    return
  fi
  if [ -d "${HOME}/Downloads/autosweb" ]; then
    echo "${HOME}/Downloads/autosweb"
    return
  fi
  if [ -d "${HOME}/Letöltések/bymy" ]; then
    echo "${HOME}/Letöltések/bymy"
    return
  fi
  if [ -d "${HOME}/Letöltések/autosweb" ]; then
    echo "${HOME}/Letöltések/autosweb"
    return
  fi
  echo "${root}/bymy"
}
