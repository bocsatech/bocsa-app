# BOCSA Pro — Linux vékony kliens

A **teljes BOCSA Pro a szerveren** fut. A Linux gépen csak egy **vékony kliens** van a Letöltésekben: SSH tunell + böngésző.

```
~/Downloads/bocsa Pro linux/
├── config.env           ← szerver címe, SSH user (te töltöd ki)
├── config.env.example
├── indito.sh            ← SSH tunell + localhost:3850 megnyitás
├── leallitas.sh         ← tunell leállítás
├── szerver-ssh.sh       ← terminálos SSH a szerverre
└── BOCSA-PRO-LINUX.txt
```

**Nincs** `src/`, `node_modules/`, `npm install` — az mind a **szerveren** van.

Telepítő scriptek (git repó): `bocsa-app/pro-orchestrator/linux/`

## Telepítés (egyszer)

```bash
cd ~/bocsa-app/pro-orchestrator/linux
chmod +x *.sh client/*.sh
./telepites.sh
nano ~/Downloads/bocsa\ Pro\ linux/config.env
```

## Indítás

```bash
~/Desktop/bocsa-pro-linux-indito.sh
```

→ SSH tunell → http://127.0.0.1:3850 (a szerveren futó BOCSA Pro)

## SSH a szerverre (terminál)

```bash
~/Downloads/bocsa\ Pro\ linux/szerver-ssh.sh
```

## Frissítés (csak kliens scriptek)

```bash
cd ~/bocsa-app/pro-orchestrator/linux
./frissites.sh
```
