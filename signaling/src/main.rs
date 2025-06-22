mod auth;
mod room;
mod server;
mod messages;

use anyhow::Result;
use clap::Parser;
use std::env;
use tracing::{info, error};
use tracing_subscriber;

#[derive(Parser)]
#[command(name = "webrtc-signaling")]
#[command(about = "WebRTC signaling server with JWT authentication")]
struct Args {
    #[arg(short, long, default_value = "9000")]
    port: u16,

    #[arg(short, long, default_value = "0.0.0.0")]
    host: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            env::var("RUST_LOG")
                .unwrap_or_else(|_| "info".to_string())
        )
        .init();

    let args = Args::parse();

    // Get JWT secret from environment
    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            error!("JWT_SECRET environment variable not set, using default (INSECURE!)");
            "dev-super-secret-jwt-key-change-in-production".to_string()
        });

    info!("Starting WebRTC signaling server on {}:{}", args.host, args.port);
    info!("JWT authentication enabled");

    // Start the server
    if let Err(e) = server::start_server(args.host, args.port, jwt_secret).await {
        error!("Server error: {}", e);
        std::process::exit(1);
    }

    Ok(())
}
