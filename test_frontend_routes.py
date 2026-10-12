import urllib.request
import urllib.error

FRONTEND_URL = "http://localhost:5173"

ROUTES = [
    "/",
    "/login",
    "/register",
    "/onboarding",
    "/dashboard",
    "/portfolios",
    "/holdings",
    "/transactions",
    "/analytics",
    "/risk",
    "/diversification",
    "/ai-advisor",
    "/recommendations",
    "/news",
    "/reports",
    "/notifications",
    "/profile",
    "/settings",
    "/admin",
]

def test_frontend_routes():
    print("Testing Frontend HTTP Routes on Vite dev server:")
    all_ok = True
    for route in ROUTES:
        url = f"{FRONTEND_URL}{route}"
        try:
            req = urllib.request.Request(url, headers={"Accept": "text/html"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                status = resp.status
                html = resp.read().decode("utf-8")
                has_root = '<div id="root">' in html or '<script type="module" src="/src/main.tsx">' in html
                if status == 200 and has_root:
                    print(f"  [PASS] {route} -> 200 OK (SPA index rendered)")
                else:
                    print(f"  [FAIL] {route} -> status {status}")
                    all_ok = False
        except Exception as e:
            print(f"  [ERROR] {route} -> {e}")
            all_ok = False
    return all_ok

if __name__ == "__main__":
    success = test_frontend_routes()
    if not success:
        exit(1)
    print("\nAll frontend routes responded with 200 OK and valid SPA shell!")
