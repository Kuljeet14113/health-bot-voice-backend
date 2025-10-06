# HelthBot Backend

## Environment Variables (.env)

Create a `.env` file in the `server/` directory with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password_or_app_password
EMAIL_FROM="HelthBot <your_email@example.com>"
```

- **Never commit your .env file to version control.**
- Use strong secrets for JWT and email passwords.

## Error Handling
- All API endpoints return JSON with `success`, `message`, and (if relevant) `data` fields.
- Handle errors on the frontend and show user-friendly messages.
- Rate limiting is enforced for OTP requests (1 per minute).
- OTPs expire after 10 minutes.

## Running the Server

```bash
npm install
npm run dev
```

The server will run on `http://localhost:3000` by default.