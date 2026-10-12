import httpx
import time

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    print("=" * 70)
    print("CAPITALMIND RBAC & INDIAN STOCK MARKET SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. RBAC Tests: Normal User vs Admin
    # -------------------------------------------------------------
    print("\n[1] RBAC Verification:")
    # 1.1 Unauthenticated access to /api/admin/health
    res_unauth = client.get("/api/admin/health")
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"
    print("  [PASS] Unauthenticated -> /api/admin/health rejected with 401")

    # 1.2 Normal user login
    email_user = f"trader_{int(time.time())}@capitalmind.ai"
    reg_user = client.post("/api/auth/register", json={
        "email": email_user,
        "password": "UserPass123!",
        "full_name": "Rohan Deshmukh"
    })
    assert reg_user.status_code == 200
    token_user = reg_user.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token_user}"}
    print(f"  [PASS] Registered normal user: {email_user} (Role: Retail Investor)")

    # 1.3 Normal user accessing /api/admin/health -> Must return 403 Forbidden!
    res_norm_admin = client.get("/api/admin/health", headers=user_headers)
    assert res_norm_admin.status_code == 403, f"Expected 403 Forbidden, got {res_norm_admin.status_code}"
    print("  [PASS] Normal User (Retail Investor) -> /api/admin/health rejected with 403 Forbidden")

    # 1.4 Admin login
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@capitalmind.ai",
        "password": "admin123"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    token_admin = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token_admin}"}
    print("  [PASS] Admin logged in successfully (Role: Admin)")

    # 1.5 Admin accessing /api/admin/health -> 200 OK
    res_admin_ok = client.get("/api/admin/health", headers=admin_headers)
    assert res_admin_ok.status_code == 200, f"Expected 200 for admin, got {res_admin_ok.status_code}"
    data_admin = res_admin_ok.json()
    assert data_admin["status"] == "Healthy"
    assert data_admin["requestedBy"]["role"] == "Admin"
    print("  [PASS] Admin User -> /api/admin/health allowed with 200 OK")

    # -------------------------------------------------------------
    # 2. Indian Stock Market Data Tests
    # -------------------------------------------------------------
    print("\n[2] Stock Market API Verification:")
    # 2.1 Search stocks
    res_search = client.get("/api/stocks/search?q=TCS")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data) >= 1
    tcs = search_data[0]
    assert tcs["symbol"] == "TCS"
    assert tcs["exchange"] == "NSE"
    assert tcs["data_source"] in ("mock", "upstox")
    assert isinstance(tcs["is_real_time"], bool)
    print(f"  [PASS] GET /api/stocks/search?q=TCS -> Found {tcs['name']} (Rs.{tcs['current_price']}) [data_source={tcs['data_source']}]")

    # Search by partial name
    res_search_name = client.get("/api/stocks/search?q=Reliance")
    assert res_search_name.status_code == 200
    assert any(s["symbol"] == "RELIANCE" for s in res_search_name.json())
    print("  [PASS] GET /api/stocks/search?q=Reliance -> Found RELIANCE by company name")

    # 2.2 Stock Details
    res_details = client.get("/api/stocks/INFY")
    assert res_details.status_code == 200
    infy = res_details.json()
    assert infy["symbol"] == "INFY"
    assert infy["isin"] == "INE009A01021"
    assert "week_52_high" in infy
    assert "pe_ratio" in infy
    assert infy["data_source"] in ("mock", "upstox")
    assert isinstance(infy["is_real_time"], bool)
    assert "disclaimer" in infy
    print(f"  [PASS] GET /api/stocks/INFY -> Details retrieved (PE: {infy['pe_ratio']}, 52w High: Rs.{infy['week_52_high']})")

    # 2.3 Stock Quote
    res_quote = client.get("/api/stocks/HDFCBANK/quote")
    assert res_quote.status_code == 200
    hdfc_quote = res_quote.json()
    assert hdfc_quote["symbol"] == "HDFCBANK"
    assert "day_change" in hdfc_quote
    assert "day_change_percentage" in hdfc_quote
    print(f"  [PASS] GET /api/stocks/HDFCBANK/quote -> Price Rs.{hdfc_quote['current_price']} ({hdfc_quote['day_change_percentage']}%)")

    # 2.4 Historical Chart Data
    res_hist = client.get("/api/stocks/RELIANCE/history?timeframe=1M")
    assert res_hist.status_code == 200
    hist_points = res_hist.json()
    assert len(hist_points) >= 20
    assert "close" in hist_points[0]
    assert "formatted_date" in hist_points[0]
    print(f"  [PASS] GET /api/stocks/RELIANCE/history?timeframe=1M -> {len(hist_points)} chart data points")

    # 2.5 Market Status
    res_mkt = client.get("/api/market/status")
    assert res_mkt.status_code == 200
    mkt = res_mkt.json()
    assert "status" in mkt
    assert "indices" in mkt
    assert "NIFTY_50" in mkt["indices"]
    print(f"  [PASS] GET /api/market/status -> Status: {mkt['status']} (Session: {mkt['session']})")

    # 2.6 Invalid symbol handling
    res_invalid = client.get("/api/stocks/INVALID_XYZ_999")
    assert res_invalid.status_code == 404
    print("  [PASS] GET /api/stocks/INVALID_XYZ_999 -> Handled gracefully with 404")

    # -------------------------------------------------------------
    # 3. User-Scoped Watchlist Tests & Tenant Isolation
    # -------------------------------------------------------------
    print("\n[3] Watchlist & Tenant Isolation Verification:")
    # 3.1 Get watchlists (auto-creates default for new user)
    res_wl = client.get("/api/watchlist", headers=user_headers)
    assert res_wl.status_code == 200
    watchlists = res_wl.json()
    assert len(watchlists) >= 1
    primary_wl = watchlists[0]
    wl_id = primary_wl["id"]
    print(f"  [PASS] GET /api/watchlist -> Found user watchlist '{primary_wl['name']}' ({len(primary_wl['symbols'])} symbols)")

    # 3.2 Add stock to watchlist
    res_add = client.post(f"/api/watchlist/{wl_id}/stocks", headers=user_headers, json={"symbol": "TATAMOTORS"})
    assert res_add.status_code == 200
    updated_wl = res_add.json()
    assert "TATAMOTORS" in updated_wl["symbols"]
    print(f"  [PASS] POST /api/watchlist/{wl_id}/stocks -> Added TATAMOTORS to watchlist")

    # 3.3 Remove stock from watchlist
    res_rem = client.delete(f"/api/watchlist/{wl_id}/stocks/TATAMOTORS", headers=user_headers)
    assert res_rem.status_code == 200
    cleaned_wl = res_rem.json()
    assert "TATAMOTORS" not in cleaned_wl["symbols"]
    print(f"  [PASS] DELETE /api/watchlist/{wl_id}/stocks/TATAMOTORS -> Removed TATAMOTORS from watchlist")

    # 3.4 Create second custom watchlist
    res_create_wl = client.post("/api/watchlist", headers=user_headers, json={
        "name": "High Conviction Growth",
        "symbols": ["TCS", "BAJFINANCE"]
    })
    assert res_create_wl.status_code == 201
    custom_wl = res_create_wl.json()
    custom_wl_id = custom_wl["id"]
    print(f"  [PASS] POST /api/watchlist -> Created '{custom_wl['name']}' (id: {custom_wl_id})")

    # 3.5 Cross-tenant Watchlist Isolation
    # Register User B
    reg_user_b = client.post("/api/auth/register", json={
        "email": f"investor_b_{int(time.time())}@capitalmind.ai",
        "password": "UserBPass123!",
        "full_name": "Pooja Reddy"
    })
    assert reg_user_b.status_code == 200
    token_b = reg_user_b.json()["access_token"]
    user_b_headers = {"Authorization": f"Bearer {token_b}"}

    # User B should NOT see User A's custom watchlist
    res_wl_b = client.get("/api/watchlist", headers=user_b_headers)
    assert res_wl_b.status_code == 200
    b_watchlists = res_wl_b.json()
    assert not any(w["id"] == custom_wl_id for w in b_watchlists)
    print("  [PASS] User B cannot see User A's watchlist in listing")

    # User B trying to mutate User A's watchlist -> 404 Not Found
    res_b_tamper = client.post(f"/api/watchlist/{custom_wl_id}/stocks", headers=user_b_headers, json={"symbol": "INFY"})
    assert res_b_tamper.status_code == 404
    print("  [PASS] Cross-tenant modification rejected (User B cannot add to User A's watchlist) -> 404")

    res_b_delete = client.delete(f"/api/watchlist/{custom_wl_id}/stocks/TCS", headers=user_b_headers)
    assert res_b_delete.status_code == 404
    print("  [PASS] Cross-tenant deletion rejected (User B cannot delete from User A's watchlist) -> 404")

    print("\n" + "=" * 70)
    print("ALL RBAC & MARKET DATA FOUNDATION TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
