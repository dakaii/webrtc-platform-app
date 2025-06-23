use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use tracing::{debug, error};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: u32, // subject (user ID as number)
    pub username: String,
    pub iat: usize, // issued at
    pub exp: usize, // expiration
}

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub user_id: u32,
    pub username: String,
}

pub struct JwtValidator {
    secret: DecodingKey,
    validation: Validation,
}

impl JwtValidator {
    pub fn new(secret: &str) -> Self {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;
        // Note: validate_iat field was removed in newer jsonwebtoken versions

        Self {
            secret: DecodingKey::from_secret(secret.as_ref()),
            validation,
        }
    }

    pub fn validate_token(&self, token: &str) -> Result<AuthenticatedUser, String> {
        debug!("Validating JWT token");

        match decode::<Claims>(token, &self.secret, &self.validation) {
            Ok(token_data) => {
                let claims = token_data.claims;
                debug!("Token validated for user: {}", claims.username);

                Ok(AuthenticatedUser {
                    user_id: claims.sub,
                    username: claims.username,
                })
            }
            Err(e) => {
                error!("JWT validation failed: {}", e);
                Err(format!("Invalid token: {}", e))
            }
        }
    }
}

pub fn extract_token_from_query(query: &str) -> Option<String> {
    // Parse query string to extract token
    // Expected format: ?token=jwt_token_here
    for param in query.split('&') {
        if let Some(stripped) = param.strip_prefix("token=") {
            return Some(stripped.to_string());
        }
    }
    None
}

// ALTERNATIVE AUTHENTICATION METHOD (NOT CURRENTLY USED)
// Cookie-based authentication approach for future use
// This would be used if we want to authenticate via HTTP cookies instead of first message
#[allow(dead_code)]
pub fn extract_token_from_cookies(cookie_header: &str) -> Option<String> {
    // Parse cookies to extract JWT token
    // Expected cookies: auth_token, jwt, or token
    let cookie_names = ["auth_token", "jwt", "token"];

    for cookie in cookie_header.split(';') {
        let cookie = cookie.trim();
        for &name in &cookie_names {
            let prefix = format!("{}=", name);
            if let Some(stripped) = cookie.strip_prefix(&prefix) {
                return Some(stripped.to_string());
            }
        }
    }
    None
}

// ALTERNATIVE AUTHENTICATION METHOD (NOT CURRENTLY USED)
// Header-based authentication approach for future use
// This would extract JWT tokens from HTTP headers during WebSocket upgrade
#[allow(dead_code)]
pub fn extract_token_from_headers(headers: &[(&str, &str)]) -> Option<String> {
    for (name, value) in headers {
        let name_lower = name.to_lowercase();

        // Check Authorization header with Bearer token
        if name_lower == "authorization" {
            if let Some(token) = value.strip_prefix("Bearer ") {
                return Some(token.to_string());
            }
        }

        // Check custom auth headers
        if name_lower == "x-auth-token" || name_lower == "x-jwt-token" {
            return Some(value.to_string());
        }
    }
    None
}
