/**
 * Tests for the keyless domain-wide delegation in functions/src/google-admin.ts
 *
 * Context (issue #83): gen2 functions run on Cloud Run with the Compute
 * Engine default service account and NO private key, so
 * `new GoogleAuth({ clientOptions: { subject } })` cannot mint a delegated
 * token and every Directory API call fails with "Not Authorized to access
 * this resource/api". The fix signs the delegation JWT through the IAM
 * Credentials API (`signJwt`) with the runtime ADC and exchanges it at the
 * OAuth token endpoint.
 *
 * Verifies:
 *   - the signJwt assertion carries iss = SA, sub = admin email, the two
 *     Directory scopes, aud = token endpoint and a 1 h lifetime;
 *   - the signed JWT is exchanged with the jwt-bearer grant and the
 *     resulting access token is what the Directory client is built with;
 *   - the SA email comes from ADC unless GOOGLE_GROUPS_SA_EMAIL overrides it;
 *   - the token is cached and re-minted ~5 min before expiry;
 *   - failures surface as the existing `false` return, never as a throw.
 *
 * Mocking strategy mirrors alternate-email.test.ts: `firebase-admin` and
 * `googleapis` are mocked by absolute path (the SUT lives in functions/ and
 * resolves its own node_modules), global `fetch` is stubbed per test, and
 * the SUT is re-imported per test so its module-level token cache is fresh.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const PATHS = vi.hoisted(() => {
  // vi.hoisted runs before any import, so build the absolute paths from
  // process.cwd() (vitest runs from the repo root) instead of node:path.
  // functions/node_modules may be a symlink in a worktree; vite resolves the
  // SUT's import to the real path, so the mock spec must match it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const modules = fs.realpathSync(`${process.cwd()}/functions/node_modules`);
  return {
    // Modular entry (vite picks the "import" export condition, hence lib/esm).
    firebaseAdminApp: `${modules}/firebase-admin/lib/esm/app/index.js`,
    googleapis: `${modules}/googleapis/build/src/index.js`,
  };
});

const H = vi.hoisted(() => {
  const getCredentials = vi.fn();
  const signJwt = vi.fn();
  const membersInsert = vi.fn();
  const membersDelete = vi.fn();
  const adminFactory = vi.fn();
  const iamcredentialsFactory = vi.fn();
  const googleAuthCtor = vi.fn();

  class FakeGoogleAuth {
    constructor(opts: unknown) {
      googleAuthCtor(opts);
    }
    getCredentials = getCredentials;
  }

  class FakeOAuth2 {
    credentials: Record<string, unknown> = {};
    setCredentials(c: Record<string, unknown>) {
      this.credentials = c;
    }
  }

  return {
    getCredentials,
    signJwt,
    membersInsert,
    membersDelete,
    adminFactory,
    iamcredentialsFactory,
    googleAuthCtor,
    FakeGoogleAuth,
    FakeOAuth2,
  };
});

vi.mock(PATHS.firebaseAdminApp, () => ({
  getApp: () => ({ options: {} }),
}));

vi.mock(PATHS.googleapis, () => ({
  google: {
    auth: { GoogleAuth: H.FakeGoogleAuth, OAuth2: H.FakeOAuth2 },
    iamcredentials: H.iamcredentialsFactory,
    admin: H.adminFactory,
    sheets: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SA_EMAIL = '706604039024-compute@developer.gserviceaccount.com';
const ADMIN_EMAIL = 'admin@secid.mx';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SIGNED_JWT = 'header.payload.signature';
const DIRECTORY_SCOPE =
  'https://www.googleapis.com/auth/admin.directory.group ' +
  'https://www.googleapis.com/auth/admin.directory.group.member';

const fetchMock = vi.fn();
let errorSpy: ReturnType<typeof vi.spyOn>;

function tokenResponse(accessToken: string, expiresIn = 3600) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      access_token: accessToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
    }),
    text: async () => '',
  };
}

async function loadSut() {
  vi.resetModules();
  return import('../../../functions/src/google-admin');
}

function signedPayload(callIndex = 0): Record<string, unknown> {
  const params = H.signJwt.mock.calls[callIndex][0];
  return JSON.parse(params.requestBody.payload);
}

function exchangeBody(callIndex = 0): URLSearchParams {
  const init = fetchMock.mock.calls[callIndex][1];
  return new URLSearchParams(String(init.body));
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  delete process.env.GOOGLE_GROUPS_SA_EMAIL;

  H.getCredentials.mockReset().mockResolvedValue({ client_email: SA_EMAIL });
  H.signJwt.mockReset().mockResolvedValue({ data: { signedJwt: SIGNED_JWT } });
  H.iamcredentialsFactory.mockReset().mockReturnValue({
    projects: { serviceAccounts: { signJwt: H.signJwt } },
  });
  H.membersInsert.mockReset().mockResolvedValue({ data: {} });
  H.membersDelete.mockReset().mockResolvedValue({ data: {} });
  H.adminFactory.mockReset().mockReturnValue({
    members: { insert: H.membersInsert, delete: H.membersDelete },
  });
  H.googleAuthCtor.mockReset();
  fetchMock.mockReset().mockResolvedValue(tokenResponse('access-token-1'));
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// { concurrent: false }: vitest.config.ts sets sequence.concurrent=true, but
// every test here shares the same mock spies and the SUT's token cache, so
// they must run one at a time (same approach as alternate-email.test.ts).
describe(
  'google-admin keyless domain-wide delegation',
  { concurrent: false },
  () => {
    it('signs the delegation JWT via IAM Credentials as the runtime SA', async () => {
      const sut = await loadSut();
      const before = Math.floor(Date.now() / 1000);

      await sut.addMemberToGroup('miembros@secid.mx', 'alumni@example.com');

      expect(H.signJwt).toHaveBeenCalledTimes(1);
      expect(H.signJwt.mock.calls[0][0].name).toBe(
        `projects/-/serviceAccounts/${SA_EMAIL}`
      );
      const payload = signedPayload();
      expect(payload.iss).toBe(SA_EMAIL);
      expect(payload.sub).toBe(ADMIN_EMAIL);
      expect(payload.scope).toBe(DIRECTORY_SCOPE);
      expect(payload.aud).toBe(TOKEN_URL);
      expect(payload.iat).toBeGreaterThanOrEqual(before);
      expect((payload.exp as number) - (payload.iat as number)).toBe(3600);
    });

    it('never asks the ADC client itself to impersonate (no subject)', async () => {
      const sut = await loadSut();

      await sut.addMemberToGroup('miembros@secid.mx', 'alumni@example.com');

      for (const [opts] of H.googleAuthCtor.mock.calls) {
        expect(opts?.clientOptions?.subject).toBeUndefined();
      }
    });

    it('exchanges the signed JWT with the jwt-bearer grant', async () => {
      const sut = await loadSut();

      await sut.addMemberToGroup('miembros@secid.mx', 'alumni@example.com');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(TOKEN_URL);
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      );
      const body = exchangeBody();
      expect(body.get('grant_type')).toBe(
        'urn:ietf:params:oauth:grant-type:jwt-bearer'
      );
      expect(body.get('assertion')).toBe(SIGNED_JWT);
    });

    it('builds the Directory client with the exchanged access token', async () => {
      const sut = await loadSut();

      await sut.addMemberToGroup('miembros@secid.mx', 'alumni@example.com');

      expect(H.adminFactory).toHaveBeenCalledTimes(1);
      const { version, auth } = H.adminFactory.mock.calls[0][0];
      expect(version).toBe('directory_v1');
      expect(auth).toBeInstanceOf(H.FakeOAuth2);
      expect(auth.credentials).toEqual({ access_token: 'access-token-1' });
      expect(H.membersInsert).toHaveBeenCalledWith({
        groupKey: 'miembros@secid.mx',
        requestBody: { email: 'alumni@example.com', role: 'MEMBER' },
      });
    });

    it('prefers GOOGLE_GROUPS_SA_EMAIL over the ADC service account', async () => {
      process.env.GOOGLE_GROUPS_SA_EMAIL =
        'groups-bot@secid-org.iam.gserviceaccount.com';
      const sut = await loadSut();

      await sut.addMemberToGroup('miembros@secid.mx', 'alumni@example.com');

      expect(H.getCredentials).not.toHaveBeenCalled();
      expect(H.signJwt.mock.calls[0][0].name).toBe(
        'projects/-/serviceAccounts/groups-bot@secid-org.iam.gserviceaccount.com'
      );
      expect(signedPayload().iss).toBe(
        'groups-bot@secid-org.iam.gserviceaccount.com'
      );
    });

    it('reuses the cached token across calls until near expiry', async () => {
      const sut = await loadSut();

      await sut.addMemberToGroup('miembros@secid.mx', 'a@example.com');
      await sut.removeMemberFromGroup(
        'colaboradores@secid.mx',
        'a@example.com'
      );

      expect(H.signJwt).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(H.membersInsert).toHaveBeenCalledTimes(1);
      expect(H.membersDelete).toHaveBeenCalledTimes(1);
    });

    it('re-mints the token when it is within 5 minutes of expiry', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-18T22:00:00Z') });
      fetchMock
        .mockResolvedValueOnce(tokenResponse('access-token-1', 3600))
        .mockResolvedValueOnce(tokenResponse('access-token-2', 3600));
      const sut = await loadSut();

      await sut.addMemberToGroup('miembros@secid.mx', 'a@example.com');
      vi.setSystemTime(new Date('2026-10-18T22:56:00Z')); // 4 min left
      await sut.addMemberToGroup('miembros@secid.mx', 'b@example.com');

      expect(H.signJwt).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const auths = H.adminFactory.mock.calls.map((c) => c[0].auth.credentials);
      expect(auths).toEqual([
        { access_token: 'access-token-1' },
        { access_token: 'access-token-2' },
      ]);
    });

    it('returns false (does not throw) when the token exchange is rejected', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => '{"error":"unauthorized_client"}',
      });
      const sut = await loadSut();

      const result = await sut.addMemberToGroup(
        'miembros@secid.mx',
        'a@example.com'
      );

      expect(result).toBe(false);
      expect(H.membersInsert).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error adding a@example.com to miembros@secid.mx'
        ),
        expect.stringContaining('unauthorized_client')
      );
    });

    it('returns false when the runtime service account email cannot be resolved', async () => {
      H.getCredentials.mockResolvedValue({});
      const sut = await loadSut();

      const result = await sut.addMemberToGroup(
        'miembros@secid.mx',
        'a@example.com'
      );

      expect(result).toBe(false);
      expect(H.signJwt).not.toHaveBeenCalled();
    });

    it('keeps treating 409 on insert as success', async () => {
      H.membersInsert.mockRejectedValue({
        code: 409,
        message: 'Member exists',
      });
      const sut = await loadSut();

      await expect(
        sut.addMemberToGroup('miembros@secid.mx', 'a@example.com')
      ).resolves.toBe(true);
    });
  }
);
