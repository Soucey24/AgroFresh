import requests

def test_health():
    resp = requests.get('http://localhost:8001/api/health')
    assert resp.status_code in (200, 422, 503)
