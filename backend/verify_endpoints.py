import time
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_flow():
    # Wait for the server to spin up
    print("Waiting 3 seconds for server to start...")
    time.sleep(3)

    client = httpx.Client()
    email = f"test_{int(time.time())}@krypta.app"
    password = "SuperPassword123!"

    print(f"--- 1. Testing Register (Email: {email}) ---")
    reg_response = client.post(
        f"{BASE_URL}/auth/register",
        json={"email": email, "password": password}
    )
    assert reg_response.status_code == 201, f"Failed register: {reg_response.text}"
    user_data = reg_response.json()
    print("Register Success:", user_data)

    print("\n--- 2. Testing Login ---")
    login_response = client.post(
        f"{BASE_URL}/auth/login",
        data={"username": email, "password": password}
    )
    assert login_response.status_code == 200, f"Failed login: {login_response.text}"
    token_data = login_response.json()
    token = token_data["access_token"]
    print("Login Success. Token received.")

    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 3. Testing Create Workspace ---")
    ws_name = "Engineering Prod"
    ws_response = client.post(
        f"{BASE_URL}/workspaces",
        json={"name": ws_name},
        headers=headers
    )
    assert ws_response.status_code == 201, f"Failed workspace creation: {ws_response.text}"
    ws_data = ws_response.json()
    workspace_id = ws_data["id"]
    print(f"Workspace Created Success. ID: {workspace_id}")

    print("\n--- 4. Testing List Workspaces ---")
    list_ws_response = client.get(
        f"{BASE_URL}/workspaces",
        headers=headers
    )
    assert list_ws_response.status_code == 200, f"Failed workspace listing: {list_ws_response.text}"
    workspaces = list_ws_response.json()
    print(f"List Workspaces Success. Found {len(workspaces)} workspaces.")
    assert any(ws["id"] == workspace_id for ws in workspaces)

    print("\n--- 5. Testing Create Secret (Version 1) ---")
    secret_key = "DATABASE_PASSWORD"
    secret_val_1 = "postgres123"
    sec_response = client.post(
        f"{BASE_URL}/workspaces/{workspace_id}/secrets",
        json={"environment": "production", "secret_key": secret_key, "secret_value": secret_val_1},
        headers=headers
    )
    assert sec_response.status_code == 201, f"Failed secret creation: {sec_response.text}"
    sec_data = sec_response.json()
    print("Secret V1 Created:", sec_data)
    assert sec_data["version"] == 1
    assert sec_data["secret_value"] == secret_val_1

    print("\n--- 6. Testing Update Secret (Version 2) ---")
    secret_val_2 = "secure_password_abc"
    sec_update_response = client.post(
        f"{BASE_URL}/workspaces/{workspace_id}/secrets",
        json={"environment": "production", "secret_key": secret_key, "secret_value": secret_val_2},
        headers=headers
    )
    assert sec_update_response.status_code == 201, f"Failed secret update: {sec_update_response.text}"
    sec_update_data = sec_update_response.json()
    print("Secret V2 Updated:", sec_update_data)
    assert sec_update_data["version"] == 2
    assert sec_update_data["secret_value"] == secret_val_2

    print("\n--- 7. Testing Get Secrets ---")
    get_secrets_response = client.get(
        f"{BASE_URL}/workspaces/{workspace_id}/secrets",
        headers=headers
    )
    assert get_secrets_response.status_code == 200, f"Failed to get secrets: {get_secrets_response.text}"
    secrets_list = get_secrets_response.json()
    print("Get Secrets Success:", secrets_list)
    assert len(secrets_list) == 1
    assert secrets_list[0]["secret_key"] == secret_key
    assert secrets_list[0]["secret_value"] == secret_val_2
    assert secrets_list[0]["version"] == 2

    print("\n--- ALL TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    test_flow()
