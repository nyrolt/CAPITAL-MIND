import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://localhost:8000/api"

def make_request(method, endpoint, body=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_data = json.loads(content)
        except Exception:
            err_data = {"raw": content}
        return e.code, err_data

def run_tests():
    print("=" * 60)
    print("E2E FRONTEND -> FASTAPI BACKEND VERIFICATION")
    print("=" * 60)

    # A. Register a new development user
    import uuid
    user_email = f"rohit_{uuid.uuid4().hex[:6]}@capitalmind.ai"
    reg_body = {
        "email": user_email,
        "password": "Password123!",
        "full_name": "Rohit Verma"
    }
    status, reg_res = make_request("POST", "/auth/register", reg_body)
    assert status == 200 or status == 201, f"Failed registration: {reg_res}"
    print(f"[PASS] A. Register new development user: {user_email}")

    # B. Login
    login_body = {
        "email": user_email,
        "password": "Password123!"
    }
    status, login_res = make_request("POST", "/auth/login", login_body)
    assert status == 200, f"Failed login: {login_res}"
    print("[PASS] B. Login with registered user")

    # C. Receive JWT
    token = login_res.get("access_token")
    assert token and len(token) > 20, "JWT not received"
    print(f"[PASS] C. Received valid JWT (len={len(token)})")

    # Verify /api/auth/me
    status, me_res = make_request("GET", "/auth/me", token=token)
    assert status == 200 and me_res["email"] == user_email, f"Failed /auth/me: {me_res}"
    user_id = me_res["user_id"]
    print(f"[PASS] D. Verified token against /api/auth/me: user_id={user_id}")

    # E. Create a portfolio
    port_body = {
        "name": "Alpha Tech & Green Energy",
        "objective": "Wealth Maximization",
        "riskPreference": "Aggressive",
        "description": "High growth strategic bucket"
    }
    status, port_res = make_request("POST", "/portfolio", port_body, token=token)
    assert status == 201, f"Failed portfolio creation: {port_res}"
    portfolio_id = port_res["id"]
    print(f"[PASS] E & F. Create portfolio through FastAPI: id={portfolio_id}, name={port_res['name']}")

    # G & H. Refresh frontend / List portfolios from backend
    status, list_res = make_request("GET", "/portfolio", token=token)
    assert status == 200 and any(p["id"] == portfolio_id for p in list_res), "Portfolio not found in list"
    print(f"[PASS] G & H. Portfolio successfully loaded from backend after refresh (total count={len(list_res)})")

    # I. Add a holding
    holding_body = {
        "symbol": "TCS",
        "name": "Tata Consultancy Services",
        "assetType": "Stock",
        "quantity": 25,
        "avgPrice": 3500.0,
        "currentPrice": 3500.0,
        "sector": "Technology"
    }
    status, add_h_res = make_request("POST", f"/portfolio/{portfolio_id}/holdings", holding_body, token=token)
    assert status == 200, f"Failed adding holding: {add_h_res}"
    assert len(add_h_res["holdings"]) == 1, "Holding not added to portfolio"
    holding_id = add_h_res["holdings"][0]["id"]
    print(f"[PASS] I. Holding added through FastAPI: id={holding_id}, symbol={add_h_res['holdings'][0]['symbol']}")

    # J & K. Refresh / Verify holding comes from backend
    status, get_h_res = make_request("GET", f"/portfolio/{portfolio_id}/holdings", token=token)
    assert status == 200 and len(get_h_res) == 1 and get_h_res[0]["id"] == holding_id
    assert get_h_res[0]["currentValue"] == 25 * get_h_res[0]["currentPrice"]
    print(f"[PASS] J & K. Holding verified from backend GET /portfolio/{portfolio_id}/holdings")

    # L. Add a transaction
    tx_body = {
        "symbol": "TCS",
        "assetName": "Tata Consultancy Services",
        "type": "BUY",
        "quantity": 25,
        "price": 3500.0,
        "date": "2026-09-30"
    }
    status, add_tx_res = make_request("POST", f"/portfolio/{portfolio_id}/transactions", tx_body, token=token)
    assert status == 200, f"Failed adding transaction: {add_tx_res}"
    assert len(add_tx_res["transactions"]) == 1
    tx_id = add_tx_res["transactions"][0]["id"]
    print(f"[PASS] L. Transaction added through FastAPI: id={tx_id}, totalValue={add_tx_res['transactions'][0]['totalValue']}")

    # M & N. Refresh / Verify transaction comes from backend
    status, get_tx_res = make_request("GET", f"/portfolio/{portfolio_id}/transactions", token=token)
    assert status == 200 and len(get_tx_res) == 1 and get_tx_res[0]["id"] == tx_id
    print(f"[PASS] M & N. Transaction verified from backend GET /portfolio/{portfolio_id}/transactions")

    # O. Update a holding
    update_body = {
        "quantity": 50,
        "avgPrice": 3600.0,
        "currentPrice": 3800.0,
        "sector": "Information Technology"
    }
    status, update_h_res = make_request("PUT", f"/portfolio/{portfolio_id}/holdings/{holding_id}", update_body, token=token)
    assert status == 200, f"Failed updating holding: {update_h_res}"
    updated_h = next(h for h in update_h_res["holdings"] if h["id"] == holding_id)
    assert updated_h["quantity"] == 50 and updated_h["currentPrice"] > 0
    print(f"[PASS] O. Holding updated: qty=50, currentPrice={updated_h['currentPrice']}, currentValue={updated_h['currentValue']}")

    # P. Delete a holding
    status, del_h_res = make_request("DELETE", f"/portfolio/{portfolio_id}/holdings/{holding_id}", token=token)
    assert status == 200 and len(del_h_res["holdings"]) == 0
    print(f"[PASS] P. Holding deleted from portfolio {portfolio_id}")

    # Q. Delete a portfolio
    status, del_p_res = make_request("DELETE", f"/portfolio/{portfolio_id}", token=token)
    assert status == 200, f"Failed deleting portfolio: {del_p_res}"
    print(f"[PASS] Q. Portfolio deleted successfully: {del_p_res}")

    # R. Verify UI / Backend updates correctly (portfolio no longer exists)
    status, get_deleted = make_request("GET", f"/portfolio/{portfolio_id}", token=token)
    assert status == 404, f"Deleted portfolio should return 404, got: {status}"
    print("[PASS] R. Verified deleted portfolio returns 404 Not Found")

    # Additional Security & Resiliency Tests
    print("\n--- Additional Security & Resiliency Tests ---")

    # Invalid JWT -> 401
    status, inv_res = make_request("GET", "/portfolio", token="invalid_jwt_token_xyz")
    assert status == 401, f"Expected 401 on invalid JWT, got {status}"
    print("[PASS] Invalid JWT correctly returns 401 Unauthorized")

    # Cross-tenant portfolio isolation: Demo User (usr_dev_001) portfolio p1 cannot be accessed by Rohit Verma
    status, cross_res = make_request("GET", "/portfolio/p1", token=token)
    assert status == 404, f"Cross-tenant access should be 404, got {status}"
    print("[PASS] Cross-tenant isolation verified: User cannot access another user's portfolio")

    print("\n" + "=" * 60)
    print("ALL END-TO-END FLOW TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
