use jsonwebtoken::{encode, EncodingKey, Header};
use webrtc_signaling::auth::*;

fn create_test_jwt_validator() -> JwtValidator {
    JwtValidator::new("test_secret_key_for_testing")
}

fn create_test_token(
    secret: &str,
    user_id: u32,
    username: &str,
    exp_offset_seconds: i64,
) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as usize;

    let claims = Claims {
        sub: user_id,
        username: username.to_string(),
        iat: now,
        exp: (now as i64 + exp_offset_seconds) as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .unwrap()
}

#[test]
fn test_jwt_validator_creation() {
    let validator = create_test_jwt_validator();
    // Should not panic and create successfully
    assert!(std::ptr::addr_of!(validator).is_null() == false);
}

#[test]
fn test_valid_token_validation() {
    let validator = create_test_jwt_validator();
    let token = create_test_token("test_secret_key_for_testing", 123, "testuser", 3600);

    let result = validator.validate_token(&token);
    assert!(result.is_ok());

    let user = result.unwrap();
    assert_eq!(user.user_id, 123);
    assert_eq!(user.username, "testuser");
}

#[test]
fn test_expired_token_validation() {
    let validator = create_test_jwt_validator();
    let token = create_test_token("test_secret_key_for_testing", 123, "testuser", -3600); // Expired 1 hour ago

    let result = validator.validate_token(&token);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Invalid token"));
}

#[test]
fn test_invalid_secret_token_validation() {
    let validator = create_test_jwt_validator();
    let token = create_test_token("wrong_secret", 123, "testuser", 3600);

    let result = validator.validate_token(&token);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Invalid token"));
}

#[test]
fn test_malformed_token_validation() {
    let validator = create_test_jwt_validator();

    let result = validator.validate_token("not.a.valid.jwt.token");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Invalid token"));
}

#[test]
fn test_extract_token_from_query() {
    // Test valid token extraction
    assert_eq!(
        extract_token_from_query("token=abc123&other=value"),
        Some("abc123".to_string())
    );

    // Test token at end
    assert_eq!(
        extract_token_from_query("other=value&token=xyz789"),
        Some("xyz789".to_string())
    );

    // Test token only
    assert_eq!(
        extract_token_from_query("token=solo_token"),
        Some("solo_token".to_string())
    );

    // Test no token
    assert_eq!(extract_token_from_query("other=value&something=else"), None);

    // Test empty query
    assert_eq!(extract_token_from_query(""), None);
}

#[test]
fn test_extract_token_from_cookies() {
    // Test auth_token cookie
    assert_eq!(
        extract_token_from_cookies("auth_token=abc123; other_cookie=value"),
        Some("abc123".to_string())
    );

    // Test jwt cookie
    assert_eq!(
        extract_token_from_cookies("jwt=xyz789; session=12345"),
        Some("xyz789".to_string())
    );

    // Test token cookie
    assert_eq!(
        extract_token_from_cookies("token=token123"),
        Some("token123".to_string())
    );

    // Test with spaces
    assert_eq!(
        extract_token_from_cookies(" auth_token=spaced_token ; other=val"),
        Some("spaced_token".to_string())
    );

    // Test no matching cookie
    assert_eq!(extract_token_from_cookies("session=12345; user=john"), None);

    // Test empty cookies
    assert_eq!(extract_token_from_cookies(""), None);
}

#[test]
fn test_extract_token_from_headers() {
    // Test Authorization Bearer header
    let headers = vec![
        ("authorization", "Bearer abc123"),
        ("content-type", "application/json"),
    ];
    assert_eq!(
        extract_token_from_headers(&headers),
        Some("abc123".to_string())
    );

    // Test custom header
    let headers = vec![("x-auth-token", "xyz789"), ("user-agent", "test")];
    assert_eq!(
        extract_token_from_headers(&headers),
        Some("xyz789".to_string())
    );

    // Test case insensitive
    let headers = vec![("Authorization", "Bearer case_test")];
    assert_eq!(
        extract_token_from_headers(&headers),
        Some("case_test".to_string())
    );

    // Test no matching header
    let headers = vec![("content-type", "application/json"), ("user-agent", "test")];
    assert_eq!(extract_token_from_headers(&headers), None);

    // Test empty headers
    assert_eq!(extract_token_from_headers(&[]), None);

    // Test malformed Authorization header
    let headers = vec![("authorization", "NotBearer abc123")];
    assert_eq!(extract_token_from_headers(&headers), None);
}

#[test]
fn test_authenticated_user_creation() {
    let user = AuthenticatedUser {
        user_id: 42,
        username: "test_user".to_string(),
    };

    assert_eq!(user.user_id, 42);
    assert_eq!(user.username, "test_user");
}

#[test]
fn test_claims_serialization() {
    let claims = Claims {
        sub: 123,
        username: "testuser".to_string(),
        iat: 1000000,
        exp: 2000000,
    };

    // Test that claims can be serialized/deserialized
    let json = serde_json::to_string(&claims).unwrap();
    let deserialized: Claims = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.sub, 123);
    assert_eq!(deserialized.username, "testuser");
    assert_eq!(deserialized.iat, 1000000);
    assert_eq!(deserialized.exp, 2000000);
}
