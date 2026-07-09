@echo off
cd /d "%~dp0"
echo Pushing jgriffithtech.com updates...
git add -A
git commit -m "Full animation enhancement: site-wide particles, 3D widget, GSAP scenes, $0.99 pricing"
git push
echo.
echo Done. Netlify will rebuild jgriffithtech.com in about a minute.
pause
