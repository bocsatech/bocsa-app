# BOCSA Pro — Linux (Letöltések)

A Linux verzió futási mappája:

```
~/Downloads/bocsa Pro linux/
```

A forrás a git repóban: `bocsa-app/pro-orchestrator/`  
A `linux/` almappa csak telepítő scripteket tartalmaz — **nem** kerül a Letöltésekbe.

## Telepítés (egyszer)

```bash
cd ~/bocsa-app/pro-orchestrator/linux
chmod +x *.sh
./telepites.sh
```

## Frissítés (GitHub main)

```bash
cd ~/bocsa-app/pro-orchestrator/linux
./frissites.sh
```

## Másolás git nélkül (helyi forrás friss)

```bash
cd ~/bocsa-app/pro-orchestrator/linux
./masol.sh
```

## Indítás

```bash
~/Desktop/bocsa-pro-linux-indito.sh
```

Vagy:

```bash
cd ~/Downloads/bocsa\ Pro\ linux && npm start
```

→ http://127.0.0.1:3850

## Mi kerül a Letöltések mappába?

Csak futási fájlok: `package.json`, `config.json`, `src/`, `public/`, `node_modules/`  
Mac scriptek (`MAC-*.sh`), `vendor/`, `linux/` — **nem**.
