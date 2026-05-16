@echo off
echo ========================================
echo   DON DEP DU AN N09_TDTT
echo ========================================
echo.

REM --- 1. Xoa file thua o goc ---
echo [1/5] Xoa file thua o thu muc goc...
if exist "fix_sidebar.js" del /q "fix_sidebar.js" && echo   - Da xoa fix_sidebar.js
if exist "AI_UPGRADE_DOCS.md" del /q "AI_UPGRADE_DOCS.md" && echo   - Da xoa AI_UPGRADE_DOCS.md
if exist ".env" del /q ".env" && echo   - Da xoa .env (goc)

REM --- 2. Xoa thu muc scratch ---
echo [2/5] Xoa thu muc scratch...
if exist "scratch" rmdir /s /q "scratch" && echo   - Da xoa scratch/

REM --- 3. Xoa file thua trong backend ---
echo [3/5] Xoa file thua trong backend...
if exist "backend\add_column.py" del /q "backend\add_column.py" && echo   - Da xoa backend/add_column.py
if exist "backend\add_pg_column.py" del /q "backend\add_pg_column.py" && echo   - Da xoa backend/add_pg_column.py
if exist "backend\models.txt" del /q "backend\models.txt" && echo   - Da xoa backend/models.txt
if exist "backend\reindex_standalone.py" del /q "backend\reindex_standalone.py" && echo   - Da xoa backend/reindex_standalone.py

REM --- 4. Xoa file mac dinh Vite khong su dung ---
echo [4/5] Xoa file asset khong su dung trong frontend...
if exist "frontend\src\assets\react.svg" del /q "frontend\src\assets\react.svg" && echo   - Da xoa frontend/src/assets/react.svg
if exist "frontend\src\assets\vite.svg" del /q "frontend\src\assets\vite.svg" && echo   - Da xoa frontend/src/assets/vite.svg
if exist "frontend\src\assets\hero.png" del /q "frontend\src\assets\hero.png" && echo   - Da xoa frontend/src/assets/hero.png

REM --- 5. Xoa thu muc rong ---
echo [5/5] Xoa thu muc rong trong frontend...
if exist "frontend\src\services" rmdir /q "frontend\src\services" 2>nul && echo   - Da xoa frontend/src/services/
if exist "frontend\src\hooks" rmdir /q "frontend\src\hooks" 2>nul && echo   - Da xoa frontend/src/hooks/
if exist "frontend\src\utils" rmdir /q "frontend\src\utils" 2>nul && echo   - Da xoa frontend/src/utils/
if exist "frontend\src\components\common" rmdir /q "frontend\src\components\common" 2>nul && echo   - Da xoa frontend/src/components/common/
if exist "frontend\src\components\layout" rmdir /q "frontend\src\components\layout" 2>nul && echo   - Da xoa frontend/src/components/layout/

REM --- 6. Xoa .venv o goc (neu co) ---
if exist ".venv" (
    echo [Bonus] Xoa .venv o goc...
    rmdir /s /q ".venv" && echo   - Da xoa .venv/
)

echo.
echo ========================================
echo   HOAN THANH! Du an da duoc don dep.
echo ========================================
echo.
echo Ban co the xoa file cleanup.bat nay sau khi chay xong.
pause
