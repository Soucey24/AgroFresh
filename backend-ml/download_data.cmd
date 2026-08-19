@echo off
REM Download FAOSTAT bulk and extract CSVs (Windows cmd wrapper)
setlocal

echo Using system Python (py -3 launcher)
py -3 -m scripts.download_faostat --out-dir data\raw\faostat --zip-name faostat_production.zip

if %ERRORLEVEL% neq 0 (
  echo Download failed or Python returned an error
  exit /b %ERRORLEVEL%
)

echo Done. Inspect data\raw\faostat for extracted CSVs.
endlocal
