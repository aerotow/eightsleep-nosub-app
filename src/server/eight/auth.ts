import { AUTH_URL, DEFAULT_AUTH_HEADERS, KNOWN_CLIENT_ID, KNOWN_CLIENT_SECRET } from './constants';
import { EightTokenSchema, TokenResponse, type Token } from './types';

export class AuthError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "AuthError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

async function makeAuthRequest(data: Record<string, string>): Promise<TokenResponse> {
  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: DEFAULT_AUTH_HEADERS,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new AuthError(`Auth request failed. Bad Eightsleep Credentials?`, response.status);
    }

    const json: unknown = await response.json();
    const validatedJson = EightTokenSchema.parse(json);

    return validatedJson;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    } else if (error instanceof Error) {
      throw new ValidationError(`Failed to validate response: ${error.message}`);
    } else {
      throw new AuthError("An unexpected error occurred during authentication");
    }
  }
}

export async function authenticate(email: string, password: string): Promise<Token> {
  const data = {
    client_id: KNOWN_CLIENT_ID,
    client_secret: KNOWN_CLIENT_SECRET,
    grant_type: "password",
    username: email,
    password: password,
  };

  try {
    const tokenResponse = await makeAuthRequest(data);
    if (!tokenResponse.userId) {
      throw new AuthError("Authentication response from eightsleep API should always have a userId when loggin in with credetials");
    }
    return {
      eightAccessToken: tokenResponse.access_token,
      eightRefreshToken: tokenResponse.refresh_token,
      eightExpiresAtPosix: Date.now() + tokenResponse.expires_in * 1000,
      eightUserId: tokenResponse.userId,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 401) {
        throw new AuthError("Invalid email or password");
      } else {
        throw new AuthError(`Authentication failed: ${error.message}`);
      }
    } else if (error instanceof ValidationError) {
      throw new AuthError(`Authentication failed: ${error.message}`);
    } else {
      throw new AuthError("An unexpected error occurred during authentication");
    }
  }
}

export async function obtainFreshAccessToken(refreshToken: string, existingUserId: string): Promise<Token> {
  const data = {
    client_id: KNOWN_CLIENT_ID,
    client_secret: KNOWN_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  };

  try {
    const tokenResponse = await makeAuthRequest(data);
    return {
      eightAccessToken: tokenResponse.access_token,
      eightRefreshToken: tokenResponse.refresh_token,
      eightExpiresAtPosix: Date.now() + tokenResponse.expires_in * 1000,
      eightUserId: existingUserId,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.statusCode === 401) {
        throw new AuthError("Invalid or expired refresh token");
      } else {
        throw new AuthError(`Token refresh failed: ${JSON.stringify(error)}`);
      }
    } else if (error instanceof ValidationError) {
      throw new AuthError(`Token refresh failed: ${error.message}`);
    } else {
      throw new AuthError("An unexpected error occurred during token refresh");
    }
  }
}