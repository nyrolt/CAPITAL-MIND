import sys
import time
import httpx
import psycopg
from app.config import settings

BASE_URL = "http://127.0.0.1:8000"

def test_persistence_part1():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    print("[1] Registering persistence test user...")
    email = f"persist_tester_{int(time.time())}@capitalmind.ai"
    reg_resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "PersistencePass123!",
        "full_name": "Persistence Tester"
    })
    assert reg_resp.status_code == 200, f"Register failed: {reg_resp.text}"
    token = reg_resp.json()["access_token"]
    user_id = reg_resp.json()["user"]["user_id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  [PASS] Registered user: {email} (id: {user_id})")

    print("[2] Creating portfolio...")
    p_resp = client.post("/api/portfolio", headers=headers, json={
        "name": "Persistence Test Portfolio",
        "objective": "Capital Growth",
        "riskPreference": "Moderate",
        "description": "Persistence test portfolio to verify data survives backend restart"
    })
    assert p_resp.status_code == 201, f"Create portfolio failed: {p_resp.text}"
    portfolio = p_resp.json()
    portfolio_id = portfolio["id"]
    print(f"  [PASS] Created portfolio: {portfolio_id}")

    print("[3] Adding holding...")
    h_resp = client.post(f"/api/portfolio/{portfolio_id}/holdings", headers=headers, json={
        "symbol": "TCS",
        "name": "Tata Consultancy Services Ltd.",
        "assetType": "Stock",
        "quantity": 25,
        "avgPrice": 3800.0,
        "currentPrice": 3950.0,
        "sector": "Technology"
    })
    assert h_resp.status_code == 200, f"Add holding failed: {h_resp.text}"
    updated_portfolio = h_resp.json()
    holding_id = updated_portfolio["holdings"][0]["id"]
    print(f"  [PASS] Added holding: {holding_id} (TCS)")

    print("[4] Adding transaction...")
    t_resp = client.post(f"/api/portfolio/{portfolio_id}/transactions", headers=headers, json={
        "symbol": "TCS",
        "assetName": "Tata Consultancy Services Ltd.",
        "type": "BUY",
        "quantity": 25,
        "price": 3800.0,
        "date": "2026-09-30"
    })
    assert t_resp.status_code == 200, f"Add transaction failed: {t_resp.text}"
    print(f"  [PASS] Added transaction for portfolio {portfolio_id}")

    return token, portfolio_id, holding_id, user_id

def verify_direct_postgres(portfolio_id, holding_id, user_id):
    print("[5] Verifying records directly in PostgreSQL database...")
    db_url = settings.DATABASE_URL.replace("+psycopg", "")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM users WHERE id = %s", (user_id,))
            u_row = cur.fetchone()
            assert u_row is not None, f"User {user_id} not found in PostgreSQL"
            print(f"  [PASS] DB query confirmed user in 'users' table: {u_row[1]}")

            cur.execute("SELECT id, name FROM portfolios WHERE id = %s", (portfolio_id,))
            p_row = cur.fetchone()
            assert p_row is not None, f"Portfolio {portfolio_id} not found in PostgreSQL"
            print(f"  [PASS] DB query confirmed portfolio in 'portfolios' table: {p_row[1]}")

            cur.execute("SELECT id, symbol, quantity FROM holdings WHERE portfolio_id = %s", (portfolio_id,))
            h_row = cur.fetchone()
            assert h_row is not None, f"Holding for portfolio {portfolio_id} not found in PostgreSQL"
            print(f"  [PASS] DB query confirmed holding in 'holdings' table: {h_row[1]} (qty={h_row[2]})")

            cur.execute("SELECT id, symbol, type, total_value FROM transactions WHERE portfolio_id = %s", (portfolio_id,))
            t_row = cur.fetchone()
            assert t_row is not None, f"Transaction for portfolio {portfolio_id} not found in PostgreSQL"
            print(f"  [PASS] DB query confirmed transaction in 'transactions' table: {t_row[1]} {t_row[2]} val={t_row[3]}")

if __name__ == "__main__":
    if len(sys.argv) == 1:
        token, p_id, h_id, u_id = test_persistence_part1()
        verify_direct_postgres(p_id, h_id, u_id)
        with open(".persistence_test_state.txt", "w") as f:
            f.write(f"{token}\n{p_id}\n{h_id}\n{u_id}\n")
        print("\nPart 1 complete! Ready for backend restart.")
    elif sys.argv[1] == "verify_after_restart":
        with open(".persistence_test_state.txt", "r") as f:
            lines = [line.strip() for line in f.readlines()]
            token, p_id, h_id, u_id = lines[0], lines[1], lines[2], lines[3]
        
        print("\n[6] Verifying data persistence via API AFTER backend restart...")
        client = httpx.Client(base_url=BASE_URL, timeout=10.0)
        headers = {"Authorization": f"Bearer {token}"}
        p_resp = client.get(f"/api/portfolio/{p_id}", headers=headers)
        assert p_resp.status_code == 200, f"Portfolio fetch failed after restart: {p_resp.status_code}"
        p_data = p_resp.json()
        assert p_data["id"] == p_id
        assert len(p_data["holdings"]) >= 1
        assert p_data["holdings"][0]["symbol"] == "TCS"
        assert len(p_data["transactions"]) >= 1
        assert p_data["transactions"][0]["symbol"] == "TCS"
        print(f"  [PASS] Portfolio {p_id} fetched successfully after backend restart!")
        print(f"  [PASS] Holding {p_data['holdings'][0]['symbol']} (qty={p_data['holdings'][0]['quantity']}) intact!")
        print(f"  [PASS] Transaction {p_data['transactions'][0]['symbol']} ({p_data['transactions'][0]['type']}) intact!")
        print("\nREAL PERSISTENCE TEST PASSED: All records survived backend process restart!")
