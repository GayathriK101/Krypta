# Standalone script to test and verify the Role-Based Access Control (RBAC) rules.
import time
import uuid
from fastapi.testclient import TestClient
from app.main import app

def run_rbac_tests():
    client = TestClient(app)

    # Generate unique emails for each role to avoid database conflicts
    timestamp = int(time.time())
    admin_email = f"admin_{timestamp}_{uuid.uuid4().hex[:4]}@krypta.app"
    dev_email = f"dev_{timestamp}_{uuid.uuid4().hex[:4]}@krypta.app"
    intern_email = f"intern_{timestamp}_{uuid.uuid4().hex[:4]}@krypta.app"
    password = "SuperSecurePassword123!"

    print("--- 1. Registering Users (Admin, Developer, Intern) ---")
    
    # Register Admin
    resp = client.post("/api/v1/auth/register", json={"email": admin_email, "password": password})
    assert resp.status_code == 201, f"Failed to register admin: {resp.text}"
    admin_user = resp.json()
    print(f"Registered Admin: {admin_user['email']}")

    # Register Developer
    resp = client.post("/api/v1/auth/register", json={"email": dev_email, "password": password})
    assert resp.status_code == 201, f"Failed to register developer: {resp.text}"
    dev_user = resp.json()
    print(f"Registered Developer: {dev_user['email']}")

    # Register Intern
    resp = client.post("/api/v1/auth/register", json={"email": intern_email, "password": password})
    assert resp.status_code == 201, f"Failed to register intern: {resp.text}"
    intern_user = resp.json()
    print(f"Registered Intern: {intern_user['email']}")

    print("\n--- 2. Authenticating Users ---")
    
    # Login Admin
    resp = client.post("/api/v1/auth/login", data={"username": admin_email, "password": password})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    admin_token = resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Login Developer
    resp = client.post("/api/v1/auth/login", data={"username": dev_email, "password": password})
    assert resp.status_code == 200, f"Developer login failed: {resp.text}"
    dev_token = resp.json()["access_token"]
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # Login Intern
    resp = client.post("/api/v1/auth/login", data={"username": intern_email, "password": password})
    assert resp.status_code == 200, f"Intern login failed: {resp.text}"
    intern_token = resp.json()["access_token"]
    intern_headers = {"Authorization": f"Bearer {intern_token}"}

    print("\n--- 3. Admin Creates Workspace ---")
    resp = client.post("/api/v1/workspaces", json={"name": "RBAC Test Workspace"}, headers=admin_headers)
    assert resp.status_code == 201, f"Workspace creation failed: {resp.text}"
    workspace = resp.json()
    workspace_id = workspace["id"]
    print(f"Workspace created with ID: {workspace_id}")

    print("\n--- 4. Admin Adds Developer and Intern to Workspace ---")
    
    # Add Developer
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/members",
        json={"email": dev_email, "role": "developer"},
        headers=admin_headers
    )
    assert resp.status_code == 201, f"Adding developer failed: {resp.text}"
    print("Developer successfully added to workspace.")

    # Add Intern
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/members",
        json={"email": intern_email, "role": "intern"},
        headers=admin_headers
    )
    assert resp.status_code == 201, f"Adding intern failed: {resp.text}"
    print("Intern successfully added to workspace.")

    print("\n--- 5. Setup Development and Production Secrets (using Developer account) ---")
    
    # Create development secret
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/secrets",
        json={"environment": "development", "secret_key": "DEV_KEY", "secret_value": "dev_value_123"},
        headers=dev_headers
    )
    assert resp.status_code == 201, f"Failed to create dev secret: {resp.text}"
    
    # Create production secret
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/secrets",
        json={"environment": "production", "secret_key": "PROD_KEY", "secret_value": "prod_value_123"},
        headers=dev_headers
    )
    assert resp.status_code == 201, f"Failed to create prod secret: {resp.text}"
    print("Created DEV_KEY in development and PROD_KEY in production.")

    print("\n--- 6. Test Scenario: intern tries to GET production secrets (should get 403) ---")
    resp = client.get(
        f"/api/v1/workspaces/{workspace_id}/secrets",
        params={"environment": "production"},
        headers=intern_headers
    )
    assert resp.status_code == 403, f"Intern should have been blocked from GET production secrets but got {resp.status_code}"
    error_detail = resp.json().get("detail", "")
    print(f"Intern GET production response (Expected 403): {resp.status_code} - {error_detail}")
    assert "Access denied: interns cannot access production secrets" in error_detail

    print("\n--- 7. Test Scenario: developer tries to GET production secrets (should succeed) ---")
    resp = client.get(
        f"/api/v1/workspaces/{workspace_id}/secrets",
        params={"environment": "production"},
        headers=dev_headers
    )
    assert resp.status_code == 200, f"Developer should have had access to production secrets but got {resp.status_code}"
    secrets = resp.json()
    print(f"Developer GET production response: {resp.status_code} - Secrets count: {len(secrets)}")
    assert len(secrets) == 1
    assert secrets[0]["secret_key"] == "PROD_KEY"

    print("\n--- 8. Test Scenario: intern tries to POST to production (should get 403) ---")
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/secrets",
        json={"environment": "production", "secret_key": "HACKED_KEY", "secret_value": "hack"},
        headers=intern_headers
    )
    assert resp.status_code == 403, f"Intern should have been blocked from POST to production but got {resp.status_code}"
    error_detail = resp.json().get("detail", "")
    print(f"Intern POST production response (Expected 403): {resp.status_code} - {error_detail}")
    assert "Access denied: interns cannot access production secrets" in error_detail

    print("\n--- 9. Test Scenario: intern tries to POST to development (should get 403, can ONLY read) ---")
    resp = client.post(
        f"/api/v1/workspaces/{workspace_id}/secrets",
        json={"environment": "development", "secret_key": "HACKED_DEV_KEY", "secret_value": "hack"},
        headers=intern_headers
    )
    assert resp.status_code == 403, f"Intern should have been blocked from POST to development but got {resp.status_code}"
    error_detail = resp.json().get("detail", "")
    print(f"Intern POST development response (Expected 403): {resp.status_code} - {error_detail}")
    assert "Access denied: interns do not have permission to write secrets" in error_detail

    print("\n--- 10. Test Scenario: intern lists secrets without filtering (should only see development) ---")
    resp = client.get(
        f"/api/v1/workspaces/{workspace_id}/secrets",
        headers=intern_headers
    )
    assert resp.status_code == 200, f"Intern GET list failed: {resp.text}"
    secrets = resp.json()
    print(f"Intern listing response: Found {len(secrets)} secrets.")
    for secret in secrets:
        print(f" - Key: {secret['secret_key']}, Env: {secret['environment']}")
        assert secret["environment"] == "development", f"Intern saw a non-development secret: {secret}"

    print("\n--- 11. Test Scenario: non-member tries to perform actions (should get 403) ---")
    # Register an external user
    resp = client.post("/api/v1/auth/register", json={"email": f"hacker_{timestamp}@krypta.app", "password": password})
    assert resp.status_code == 201
    hacker_token = client.post("/api/v1/auth/login", data={"username": f"hacker_{timestamp}", "password": password})
    # Wait, the username is the full email address, let's login correctly
    resp = client.post("/api/v1/auth/login", data={"username": f"hacker_{timestamp}@krypta.app", "password": password})
    assert resp.status_code == 200
    hacker_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    resp = client.get(f"/api/v1/workspaces/{workspace_id}/secrets", headers=hacker_headers)
    assert resp.status_code == 403, f"Non-member should get 403 but got {resp.status_code}"
    print(f"Non-member response: {resp.status_code} - {resp.json().get('detail', '')}")

    print("\n--- 12. Test Scenario: developer and intern try to GET audit logs (should get 403) ---")
    resp = client.get(f"/api/v1/workspaces/{workspace_id}/audit-logs", headers=dev_headers)
    assert resp.status_code == 403, f"Developer should have been blocked from GET audit logs but got {resp.status_code}"
    print(f"Developer GET audit logs response (Expected 403): {resp.status_code}")

    resp = client.get(f"/api/v1/workspaces/{workspace_id}/audit-logs", headers=intern_headers)
    assert resp.status_code == 403, f"Intern should have been blocked from GET audit logs but got {resp.status_code}"
    print(f"Intern GET audit logs response (Expected 403): {resp.status_code}")

    print("\n--- 13. Test Scenario: admin tries to GET audit logs (should succeed) ---")
    resp = client.get(f"/api/v1/workspaces/{workspace_id}/audit-logs", headers=admin_headers)
    assert resp.status_code == 200, f"Admin should have had access to audit logs but got {resp.status_code}"
    logs = resp.json()
    print(f"Admin GET audit logs response: {resp.status_code} - Logs count: {len(logs)}")
    assert len(logs) >= 2
    # Verify that the logs correctly contain the action, target key, and user email
    assert any(log["target_key"] == "PROD_KEY" and log["user_email"] == dev_email for log in logs)
    assert any(log["target_key"] == "DEV_KEY" and log["user_email"] == dev_email for log in logs)
    print("Audit logs check verified successfully: joined user email and target keys match.")

    print("\n======================================")
    print("   ALL RBAC TEST CASES PASSED SUCCESSFULLY!")
    print("======================================")

if __name__ == "__main__":
    run_rbac_tests()
