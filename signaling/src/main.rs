mod auth;
mod messages;
mod room;
mod server;

use anyhow::Result;
use clap::Parser;
use std::env;

#[derive(Parser)]
#[command(name = "webrtc-signaling")]
#[command(about = "A WebRTC signaling server")]
struct Args {
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

    let host = args.host;
    let port = env::var("PORT")
        .unwrap_or_else(|_| "9000".to_string())
        .parse::<u16>()
        .unwrap_or(9000);

    let jwt_secret = env::var("JWT_SECRET")
        .expect("JWT_SECRET environment variable is required");

    println!("Starting WebRTC signaling server on {}:{}", host, port);
    println!("JWT authentication enabled");

    server::start_server(host, port, jwt_secret).await
}
