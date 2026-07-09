@echo off
chcp 65001 >nul
echo.
echo  WILLHABEN WATCHER - Chrome telepítés
echo  =====================================
echo.
echo  1. Megnyílik a Chrome bővítmények oldal
echo  2. Kapcsold BE: Fejlesztői mód (jobb felső)
echo  3. Kattints: Kicsomagolt elemek betöltése
echo  4. Válaszd ki EZT a mappát (ahol ez a fájl van)
echo.
start chrome://extensions/
explorer "%~dp0"
pause
