export interface Env {
    // D1 database binding (defined in [[d1_databases]] in wrangler.toml)
    rent: D1Database;

    // Secrets / environment variables (set via `wrangler secret put` or [vars])
    JWT_SECRET: string;
    RAZORPAY_KEY_ID: string;
    RAZORPAY_KEY_SECRET: string;
    ENVIRONMENT: "development" | "production";
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;

    // CORS configuration (comma-separated list of allowed origins)
    ALLOWED_ORIGINS?: string;

    // Manual UPI Payment (for rent payments)
    UPI_ID: string;           // e.g., "yourname@oksbi"
    UPI_PAYEE_NAME: string;   // e.g., "Priyankuu"

    // Telegram notifications
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
}