import os
import sys
import asyncio
import uuid
import warnings

# Suppress Starlette/HTTPX deprecation warnings
warnings.filterwarnings("ignore")

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Add venv site-packages fallback so running python test_auth_and_api.py directly works outside active venv
venv_site_packages = os.path.join(backend_dir, ".venv", "Lib", "site-packages")
if os.path.isdir(venv_site_packages) and venv_site_packages not in sys.path:
    sys.path.append(venv_site_packages)

from fastapi.testclient import TestClient
from app.main import app
from app.auth.cognito_provider import cognito_auth_provider
from app.auth.schemas import AuthenticatedUser
from app.config import settings

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("CAPITALMIND BACKEND VERIFICATION & AUDIT SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. Health Endpoint & Documentation
    # -------------------------------------------------------------
    print("\n[1] Health & OpenAPI Documentation Endpoints:")
    res_health = client.get("/health")
    assert res_health.status_code == 200, f"Expected 200, got {res_health.status_code}"
    health_data = res_health.json()
    assert health_data["status"] == "Healthy"
    assert health_data["auth_mode"] == "development"
    print("  [PASS] GET /health -> 200 Healthy (AUTH_MODE=development)")

    res_docs = client.get("/docs")
    assert res_docs.status_code == 200
    print("  [PASS] GET /docs (Swagger UI) -> 200 OK")

    res_redoc = client.get("/redoc")
    assert res_redoc.status_code == 200
    print("  [PASS] GET /redoc (ReDoc UI) -> 200 OK")

    # -------------------------------------------------------------
    # 2. JWT Protection & Unauthenticated Rejection
    # -------------------------------------------------------------
    print("\n[2] JWT Protection & Unauthenticated Rejection:")
    res_unauth = client.get("/api/auth/me")
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"
    print("  [PASS] GET /api/auth/me without token -> 401 Unauthorized")

    res_invalid_token = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"}
    )
    assert res_invalid_token.status_code == 401, f"Expected 401, got {res_invalid_token.status_code}"
    print("  [PASS] GET /api/auth/me with invalid token -> 401 Unauthorized")

    res_unauth_portfolios = client.get("/api/portfolio")
    assert res_unauth_portfolios.status_code == 401
    print("  [PASS] GET /api/portfolio without token -> 401 Unauthorized")

    # -------------------------------------------------------------
    # 3. Development Authentication (Register, Login, Me)
    # -------------------------------------------------------------
    print("\n[3] Development Authentication (Register, Login, Me):")
    # Register User A
    user_a_email = f"alice_{uuid.uuid4().hex[:6]}@capitalmind.ai"
    res_reg_a = client.post(
        "/api/auth/register",
        json={"email": user_a_email, "password": "Password123!", "full_name": "Alice Sharma"}
    )
    assert res_reg_a.status_code == 200, f"Register User A failed: {res_reg_a.text}"
    token_a = res_reg_a.json()["access_token"]
    user_a_id = res_reg_a.json()["user"]["user_id"]
    print(f"  [PASS] POST /api/auth/register -> User A registered ({user_a_email}, id={user_a_id})")

    # Login User A
    res_login_a = client.post(
        "/api/auth/login",
        json={"email": user_a_email, "password": "Password123!"}
    )
    assert res_login_a.status_code == 200
    token_a = res_login_a.json()["access_token"]
    print("  [PASS] POST /api/auth/login -> User A logged in successfully")

    # Verify /api/auth/me
    headers_a = {"Authorization": f"Bearer {token_a}"}
    res_me_a = client.get("/api/auth/me", headers=headers_a)
    assert res_me_a.status_code == 200
    me_a = res_me_a.json()
    assert me_a["email"] == user_a_email
    assert me_a["auth_mode"] == "development"
    print(f"  [PASS] GET /api/auth/me -> Returns authenticated context for {me_a['name']}")

    # Register & Login User B
    user_b_email = f"bob_{uuid.uuid4().hex[:6]}@capitalmind.ai"
    res_reg_b = client.post(
        "/api/auth/register",
        json={"email": user_b_email, "password": "Password456!", "full_name": "Bob Verma"}
    )
    assert res_reg_b.status_code == 200
    token_b = res_reg_b.json()["access_token"]
    user_b_id = res_reg_b.json()["user"]["user_id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print(f"  [PASS] POST /api/auth/register -> User B registered ({user_b_email}, id={user_b_id})")

    # -------------------------------------------------------------
    # 4. Authorization & Multi-Tenant Resource Ownership
    # -------------------------------------------------------------
    print("\n[4] Authorization & Resource Ownership Isolation:")
    # User A creates Portfolio A
    res_p_a = client.post(
        "/api/portfolio",
        headers=headers_a,
        json={
            "name": "Alice Tech Growth",
            "objective": "Capital Growth",
            "riskPreference": "Aggressive",
            "description": "High beta Indian tech stocks"
        }
    )
    assert res_p_a.status_code == 201
    port_a = res_p_a.json()
    port_a_id = port_a["id"]
    print(f"  [PASS] User A created Portfolio A (id={port_a_id})")

    # User B creates Portfolio B
    res_p_b = client.post(
        "/api/portfolio",
        headers=headers_b,
        json={
            "name": "Bob Conservative Yield",
            "objective": "Capital Preservation",
            "riskPreference": "Conservative",
            "description": "Sovereign debt & liquid cash"
        }
    )
    assert res_p_b.status_code == 201
    port_b = res_p_b.json()
    port_b_id = port_b["id"]
    print(f"  [PASS] User B created Portfolio B (id={port_b_id})")

    # Verify User A cannot see Portfolio B in portfolio listing
    res_list_a = client.get("/api/portfolio", headers=headers_a)
    assert res_list_a.status_code == 200
    list_a_ids = [p["id"] for p in res_list_a.json()]
    assert port_a_id in list_a_ids
    assert port_b_id not in list_a_ids
    print("  [PASS] User A portfolio list contains Portfolio A, excludes Portfolio B")

    # Verify User B cannot see Portfolio A in portfolio listing
    res_list_b = client.get("/api/portfolio", headers=headers_b)
    assert res_list_b.status_code == 200
    list_b_ids = [p["id"] for p in res_list_b.json()]
    assert port_b_id in list_b_ids
    assert port_a_id not in list_b_ids
    print("  [PASS] User B portfolio list contains Portfolio B, excludes Portfolio A")

    # Verify User A CANNOT access Portfolio B directly -> 404/403
    res_cross_get = client.get(f"/api/portfolio/{port_b_id}", headers=headers_a)
    assert res_cross_get.status_code == 404, f"Expected 404, got {res_cross_get.status_code}"
    print(f"  [PASS] Cross-tenant GET /api/portfolio/{port_b_id} by User A correctly rejected (404)")

    # Verify User B CANNOT access Portfolio A directly -> 404/403
    res_cross_get_b = client.get(f"/api/portfolio/{port_a_id}", headers=headers_b)
    assert res_cross_get_b.status_code == 404
    print(f"  [PASS] Cross-tenant GET /api/portfolio/{port_a_id} by User B correctly rejected (404)")

    # Verify User A CANNOT add holding to Portfolio B
    res_cross_add_h = client.post(
        f"/api/portfolio/{port_b_id}/holdings",
        headers=headers_a,
        json={"symbol": "INFY", "quantity": 10, "avgPrice": 1500}
    )
    assert res_cross_add_h.status_code == 404
    print("  [PASS] Cross-tenant POST /api/portfolio/{port_b_id}/holdings by User A rejected (404)")

    # Verify User A CANNOT delete Portfolio B
    res_cross_del_p = client.delete(f"/api/portfolio/{port_b_id}", headers=headers_a)
    assert res_cross_del_p.status_code == 404
    print("  [PASS] Cross-tenant DELETE /api/portfolio/{port_b_id} by User A rejected (404)")

    # -------------------------------------------------------------
    # 5. Portfolio APIs (POST, GET list, GET id, DELETE)
    # -------------------------------------------------------------
    print("\n[5] Portfolio APIs:")
    # Create a temporary portfolio to test deletion
    res_temp_p = client.post(
        "/api/portfolio",
        headers=headers_a,
        json={"name": "Temp Portfolio", "objective": "Testing", "riskPreference": "Moderate", "description": "Delete me"}
    )
    assert res_temp_p.status_code == 201
    temp_p_id = res_temp_p.json()["id"]

    res_del_temp = client.delete(f"/api/portfolio/{temp_p_id}", headers=headers_a)
    assert res_del_temp.status_code == 200
    print(f"  [PASS] DELETE /api/portfolio/{temp_p_id} -> Successfully deleted")

    res_check_del = client.get(f"/api/portfolio/{temp_p_id}", headers=headers_a)
    assert res_check_del.status_code == 404
    print(f"  [PASS] GET /api/portfolio/{temp_p_id} after deletion -> 404 Not Found")

    # -------------------------------------------------------------
    # 6. Holdings APIs (POST, GET, PUT, DELETE)
    # -------------------------------------------------------------
    print("\n[6] Holdings APIs:")
    # Add holding to Portfolio A
    res_add_h = client.post(
        f"/api/portfolio/{port_a_id}/holdings",
        headers=headers_a,
        json={
            "symbol": "TCS",
            "name": "Tata Consultancy Services",
            "assetType": "Stock",
            "quantity": 25,
            "avgPrice": 3800.0,
            "sector": "Technology"
        }
    )
    assert res_add_h.status_code == 200
    holdings_after_add = res_add_h.json()["holdings"]
    tcs_holding = next(h for h in holdings_after_add if h["symbol"] == "TCS")
    tcs_holding_id = tcs_holding["id"]
    assert tcs_holding["quantity"] == 25
    assert tcs_holding["investedValue"] == 25 * 3800.0
    print(f"  [PASS] POST /api/portfolio/{port_a_id}/holdings -> Added TCS holding (id={tcs_holding_id})")

    # GET holdings
    res_get_h = client.get(f"/api/portfolio/{port_a_id}/holdings", headers=headers_a)
    assert res_get_h.status_code == 200
    assert any(h["id"] == tcs_holding_id for h in res_get_h.json())
    print(f"  [PASS] GET /api/portfolio/{port_a_id}/holdings -> Retrieved {len(res_get_h.json())} holdings")

    # PUT update holding
    res_put_h = client.put(
        f"/api/portfolio/{port_a_id}/holdings/{tcs_holding_id}",
        headers=headers_a,
        json={"quantity": 30, "currentPrice": 4000.0}
    )
    assert res_put_h.status_code == 200
    updated_tcs = next(h for h in res_put_h.json()["holdings"] if h["id"] == tcs_holding_id)
    assert updated_tcs["quantity"] == 30
    assert updated_tcs["currentPrice"] == 4000.0
    print(f"  [PASS] PUT /api/portfolio/{port_a_id}/holdings/{tcs_holding_id} -> Updated qty=30, price=4000")

    # DELETE holding
    res_del_h = client.delete(
        f"/api/portfolio/{port_a_id}/holdings/{tcs_holding_id}",
        headers=headers_a
    )
    assert res_del_h.status_code == 200
    assert not any(h["id"] == tcs_holding_id for h in res_del_h.json()["holdings"])
    print(f"  [PASS] DELETE /api/portfolio/{port_a_id}/holdings/{tcs_holding_id} -> Holding removed")

    # -------------------------------------------------------------
    # 7. Transactions APIs (POST, GET)
    # -------------------------------------------------------------
    print("\n[7] Transactions APIs:")
    # Add a holding first so portfolio has an asset
    client.post(
        f"/api/portfolio/{port_a_id}/holdings",
        headers=headers_a,
        json={"symbol": "INFY", "name": "Infosys", "quantity": 50, "avgPrice": 1400.0}
    )

    # Record transaction
    res_add_tx = client.post(
        f"/api/portfolio/{port_a_id}/transactions",
        headers=headers_a,
        json={
            "symbol": "INFY",
            "assetName": "Infosys Ltd.",
            "type": "BUY",
            "quantity": 50,
            "price": 1400.0,
            "date": "2026-09-25"
        }
    )
    assert res_add_tx.status_code == 200
    print(f"  [PASS] POST /api/portfolio/{port_a_id}/transactions -> Transaction recorded")

    # GET transactions
    res_get_tx = client.get(f"/api/portfolio/{port_a_id}/transactions", headers=headers_a)
    assert res_get_tx.status_code == 200
    tx_list = res_get_tx.json()
    assert len(tx_list) >= 1
    assert tx_list[0]["symbol"] == "INFY"
    print(f"  [PASS] GET /api/portfolio/{port_a_id}/transactions -> Retrieved {len(tx_list)} transactions")

    # -------------------------------------------------------------
    # 8. Analytics, Risk & AI Advisor APIs
    # -------------------------------------------------------------
    print("\n[8] Analytics, Risk, and AI Advisor APIs:")
    # Analytics
    res_analytics = client.get(f"/api/analytics/portfolio/{port_a_id}", headers=headers_a)
    assert res_analytics.status_code == 200
    print(f"  [PASS] GET /api/analytics/portfolio/{port_a_id} -> 200 OK")

    # Risk Assessment
    res_risk = client.get(f"/api/risk/portfolio/{port_a_id}", headers=headers_a)
    assert res_risk.status_code == 200
    risk_data = res_risk.json()
    assert "riskScore" in risk_data
    assert "riskFactors" in risk_data
    print(f"  [PASS] GET /api/risk/portfolio/{port_a_id} -> 200 OK (Risk Score: {risk_data['riskScore']}/100)")

    # AI Advisor Insight
    res_advisor = client.post(
        f"/api/advisor/portfolio/{port_a_id}/insight",
        headers=headers_a,
        json={"query": "Explain my portfolio risk and sector concentration"}
    )
    assert res_advisor.status_code == 200
    adv_data = res_advisor.json()
    assert "portfolioSummary" in adv_data
    assert "recommendation" in adv_data
    print(f"  [PASS] POST /api/advisor/portfolio/{port_a_id}/insight -> 200 OK (Structured AI Response)")

    # Recommendations
    res_rec = client.get(f"/api/recommendations/{port_a_id}", headers=headers_a)
    assert res_rec.status_code == 200
    print(f"  [PASS] GET /api/recommendations/{port_a_id} -> 200 OK")

    # Reports
    res_rep = client.post(f"/api/reports/{port_a_id}", headers=headers_a)
    assert res_rep.status_code == 200
    print(f"  [PASS] POST /api/reports/{port_a_id} -> 200 OK (Report Generated)")

    # Notifications
    res_notif = client.get("/api/notifications", headers=headers_a)
    assert res_notif.status_code == 200
    print("  [PASS] GET /api/notifications -> 200 OK")

    # Admin Health & RBAC verification
    res_admin_unauth = client.get("/api/admin/health")
    assert res_admin_unauth.status_code == 401, f"Expected 401 unauth, got {res_admin_unauth.status_code}"
    print("  [PASS] GET /api/admin/health unauthenticated -> 401 Unauthorized")

    res_admin_forbidden = client.get("/api/admin/health", headers=headers_a)
    assert res_admin_forbidden.status_code == 403, f"Expected 403 forbidden for normal user, got {res_admin_forbidden.status_code}"
    print("  [PASS] GET /api/admin/health normal user (Retail Investor) -> 403 Forbidden")

    # Login as Platform Administrator
    res_admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@capitalmind.ai", "password": "admin123"}
    )
    assert res_admin_login.status_code == 200, f"Admin login failed: {res_admin_login.text}"
    admin_token = res_admin_login.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    res_admin_ok = client.get("/api/admin/health", headers=headers_admin)
    assert res_admin_ok.status_code == 200, f"Expected 200 for admin, got {res_admin_ok.status_code}"
    print("  [PASS] GET /api/admin/health admin user (Admin) -> 200 OK")

    # -------------------------------------------------------------
    # 9. AWS Cognito Provider Architecture Testing
    # -------------------------------------------------------------
    print("\n[9] AWS Cognito Provider Architecture:")
    mock_cognito_token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRlbW9fa2lkIn0.eyJzdWIiOiJjb2duaXRvX3VzZXJfMDA3IiwiZW1haWwiOiJjb2duaXRvX2ludmVzdG9yQGNhcGl0YWxtaW5kLmFpIiwiZ2l2ZW5fbmFtZSI6IlByaXlhIFNoYXJtYSIsImNvZ25pdG86Z3JvdXBzIjpbIlJldGFpbEludmVzdG9ycyJdfQ.sig"
    cognito_user_ctx = asyncio.run(cognito_auth_provider.verify_token(mock_cognito_token))
    assert isinstance(cognito_user_ctx, AuthenticatedUser)
    assert cognito_user_ctx.auth_mode == "cognito"
    assert cognito_user_ctx.user_id == "cognito_user_007"
    assert cognito_user_ctx.email == "cognito_investor@capitalmind.ai"
    print("  [PASS] Cognito provider architecture verified -> Produces identical AuthenticatedUser model")

    print("\n" + "=" * 70)
    print("ALL VERIFICATION SUITE TESTS PASSED!")
    print("=" * 70)

def test_verification_suite():
    """Allows pytest and automated test runners to discover and execute this suite."""
    run_tests()

if __name__ == "__main__":
    run_tests()
