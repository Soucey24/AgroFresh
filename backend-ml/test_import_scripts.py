import sys
try:
    import scripts
    print('OK')
except Exception as e:
    print('IMPORT_ERROR', e)
    sys.exit(2)
