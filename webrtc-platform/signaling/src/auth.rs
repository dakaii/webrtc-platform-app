use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use tracing::{debug, error};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // subject (user ID as string)
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

                // Parse user ID from subject
                let user_id = claims
                    .sub
                    .parse::<u32>()
                    .map_err(|_| "Invalid user ID in token".to_string())?;

                Ok(AuthenticatedUser {
                    user_id,
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
