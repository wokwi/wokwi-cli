import chalkTemplate from 'chalk-template';

/**
 * Get the Wokwi CLI token from environment variables.
 * Exits with an error message if the token is not set.
 */
export function requireToken(): string {
  const token = process.env.WOKWI_CLI_TOKEN;
  if (token == null || token.length === 0) {
    console.error(
      chalkTemplate`{red Error:} Missing {yellow WOKWI_CLI_TOKEN} environment variable. Please set it to your Wokwi token.\nGet your token at {yellow https://wokwi.com/dashboard/ci}.`,
    );
    process.exit(1);
  }
  return token;
}
