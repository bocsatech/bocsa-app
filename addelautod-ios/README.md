# Hol van a projekt? → ~/Downloads/autosapp

A Macen a telepítő ide másol mindent:

```
~/Downloads/autosapp/
  AddElAutod.xcodeproj   ← ezt nyisd meg Xcode-ban
  AddElAutod/
  README.md
  HONNAN.txt
```

## Telepítés (egyszer a Maceden)

Terminálba másold be **egyetlen** blokként:

```bash
curl -fsSL "https://raw.githubusercontent.com/bocsatech/bocsa-app/cursor/addelautod-mobile-de62/addelautod-ios/mac/Telepit-Downloads-autosapp.command" -o /tmp/telepit-autosapp.command && chmod +x /tmp/telepit-autosapp.command && /tmp/telepit-autosapp.command
```

Ez:
1. létrehozza a `~/Downloads/autosapp` mappát
2. oda másolja az Xcode projektet
3. megnyitja Xcode-ban

## Utána

Finder → **Letöltések → autosapp → AddElAutod.xcodeproj**  
vagy Xcode: iPhone Simulator → ▶ Run
