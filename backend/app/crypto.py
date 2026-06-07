# This file handles the encryption and decryption of secrets at the application layer.
# It uses the AES-256-GCM encryption scheme from the cryptography library.

import os
import base64
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Ensure environment variables are loaded from the .env file
load_dotenv()

# Retrieve the master key from the environment variables
key_str = os.getenv("MASTER_ENCRYPTION_KEY")
if not key_str:
    raise ValueError("MASTER_ENCRYPTION_KEY environment variable is not set!")

# Decode the URL-safe base64 key to retrieve the original 32 raw bytes (256-bit key) for AES-256
raw_key = base64.urlsafe_b64decode(key_str.encode("utf-8"))

# Initialize the AESGCM cipher helper with our 256-bit master key
aesgcm = AESGCM(raw_key)


# This function takes a plaintext string, encrypts it using AES-256-GCM with a random 12-byte nonce,
# and returns a single base64-encoded string containing both the nonce and the encrypted data.
def encrypt_value(plain_text: str) -> str:
    """
    Encrypts a plaintext string using AES-256-GCM.
    
    This function takes a plaintext secret string (e.g., 'sk_live_abc123'),
    encodes it to bytes, and encrypts it using the AES-256-GCM algorithm with a
    cryptographically secure, randomly generated 12-byte initialization vector (nonce).
    It then prepends the 12-byte nonce to the encrypted ciphertext (which includes the auth tag)
    and encodes the final byte sequence as a standard base64 string.
    
    Args:
        plain_text (str): The plaintext secret value to encrypt.
        
    Returns:
        str: A base64-encoded string representing the combined nonce and ciphertext.
    """
    # Convert plaintext string into bytes
    data = plain_text.encode("utf-8")
    
    # Generate a cryptographically secure random 12-byte nonce (initialization vector)
    nonce = os.urandom(12)
    
    # Encrypt the data. AESGCM automatically appends the 16-byte authentication tag to the ciphertext.
    ciphertext_with_tag = aesgcm.encrypt(nonce, data, None)
    
    # Combine the nonce and ciphertext so the nonce can be retrieved later during decryption
    encrypted_bytes = nonce + ciphertext_with_tag
    
    # Encode the combined bytes as a base64 string and return it as a UTF-8 string
    return base64.b64encode(encrypted_bytes).decode("utf-8")


# This function takes a base64-encoded ciphertext, decodes it to get the raw bytes,
# extracts the first 12 bytes as the nonce, decrypts the remaining bytes using AES-256-GCM,
# and returns the decrypted plaintext string.
def decrypt_value(cipher_text: str) -> str:
    """
    Decrypts an AES-256-GCM encrypted ciphertext back to its original plaintext.
    
    This function takes a base64-encoded string containing both the 12-byte initialization vector (nonce)
    and the ciphertext (with tag). It decodes the base64 string, extracts the first 12 bytes
    as the nonce, and uses the remaining bytes as the ciphertext. It decrypts the ciphertext
    using AES-256-GCM with the master encryption key, and decodes the decrypted bytes
    back to the original plaintext string.
    
    Args:
        cipher_text (str): The base64-encoded encrypted secret value.
        
    Returns:
        str: The decrypted plaintext secret value.
    """
    # Decode the base64 encoded string back to the original encrypted byte array
    encrypted_bytes = base64.b64decode(cipher_text.encode("utf-8"))
    
    # Extract the first 12 bytes which represent the nonce
    nonce = encrypted_bytes[:12]
    
    # Extract the rest of the bytes which represent the ciphertext and its tag
    ciphertext_with_tag = encrypted_bytes[12:]
    
    # Decrypt the ciphertext using the extracted nonce and master key
    decrypted_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, None)
    
    # Convert the decrypted bytes back to the original plaintext string and return it
    return decrypted_bytes.decode("utf-8")
