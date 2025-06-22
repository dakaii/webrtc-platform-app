FROM rust:1.82-alpine AS builder

# Install dependencies
RUN apk add --no-cache musl-dev

# Set working directory
WORKDIR /app

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build application
RUN cargo build --release

# Runtime image
FROM alpine:3.18

# Install CA certificates for HTTPS
RUN apk add --no-cache ca-certificates

# Create app user
RUN addgroup -g 1001 -S app && \
    adduser -S app -u 1001

# Copy binary from builder
COPY --from=builder /app/target/release/webrtc-signaling /usr/local/bin/signaling

# Change ownership
RUN chown app:app /usr/local/bin/signaling

# Switch to non-root user
USER app

# Expose port
EXPOSE 9000

# Start application
CMD ["signaling"]
