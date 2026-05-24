/**
 * Tests for AddAlternateEmail React component.
 *
 * Source: src/components/profile/AddAlternateEmail.tsx
 *
 * Verifies:
 *   - non-verified members see nothing (component returns null)
 *   - verified members see the form
 *   - server error mapping by `details.reason`
 *     (members_only, primary_email, invalid_format, rate_limited, generic)
 *   - `data.alreadyLinked === true` -> "request merge" message
 *   - submit button is disabled while the callable is in-flight
 *
 * Mocking strategy:
 *   - `useAuth` is mocked so we can flip `isVerified`.
 *   - `firebase/functions` httpsCallable is mocked to return a vi.fn that
 *     each test controls (success / error shapes).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks. vi.hoisted carries shared state into the factories.
// ---------------------------------------------------------------------------

const H = vi.hoisted(() => {
  const callableFn = (() => {
    const fn: any = (...args: unknown[]) => {
      fn.calls.push(args);
      return fn.impl(...args);
    };
    fn.calls = [] as unknown[][];
    fn.impl = async (_args: unknown) => ({ data: { ok: true } });
    fn.setImpl = (impl: (args: unknown) => unknown) => {
      fn.impl = impl;
    };
    fn.reset = () => {
      fn.calls.length = 0;
      fn.impl = async (_args: unknown) => ({ data: { ok: true } });
    };
    return fn;
  })();

  const authState = {
    isVerified: true as boolean,
    userProfile: {
      uid: 'caller-uid',
      email: 'caller@example.com',
      alternateEmails: [] as Array<{ email: string; verifiedAt: unknown }>,
    },
  };

  return { callableFn, authState };
});

vi.mock('firebase/functions', () => ({
  // The signature is httpsCallable(functions, name); we return the SAME
  // wrapped callable every time so the test can assert on H.callableFn.
  httpsCallable: () => H.callableFn,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => H.authState,
}));

// Heroicons are pure presentational stubs — avoids transformation overhead.
vi.mock('@heroicons/react/24/outline', () => {
  const stub = () => null;
  return { EnvelopeIcon: stub, CheckBadgeIcon: stub };
});

// ---------------------------------------------------------------------------
// Import the SUT after mocks are wired.
// ---------------------------------------------------------------------------

import { AddAlternateEmail } from '@/components/profile/AddAlternateEmail';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function getSubmitButton(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: /Enviar enlace|Send verification|Enviando|Sending/i,
  }) as HTMLButtonElement;
}

function getEmailInput(): HTMLInputElement {
  return screen.getByPlaceholderText(
    /tu-otro-correo|your-other-email/i
  ) as HTMLInputElement;
}

async function typeAndSubmit(value: string) {
  fireEvent.change(getEmailInput(), { target: { value } });
  await act(async () => {
    fireEvent.click(getSubmitButton());
  });
}

class FakeCallableError extends Error {
  code: string;
  details: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

beforeEach(() => {
  H.callableFn.reset();
  H.authState.isVerified = true;
  H.authState.userProfile = {
    uid: 'caller-uid',
    email: 'caller@example.com',
    alternateEmails: [],
  };
});

afterEach(() => cleanup());

// ===========================================================================

describe.sequential('AddAlternateEmail', () => {
  it('renders nothing for non-verified members', () => {
    H.authState.isVerified = false;
    const { container } = render(<AddAlternateEmail lang="es" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the form for verified members', () => {
    render(<AddAlternateEmail lang="es" />);
    expect(getEmailInput()).toBeTruthy();
    expect(getSubmitButton()).toBeTruthy();
  });

  it('maps members_only -> errorMembersOnly copy', async () => {
    H.callableFn.setImpl(() => {
      throw new FakeCallableError(
        'functions/failed-precondition',
        'Not a full member',
        { reason: 'members_only' }
      );
    });
    render(<AddAlternateEmail lang="es" />);
    await typeAndSubmit('new@example.com');
    expect(
      screen.getByText(
        /miembros con membresía completa|full members only/i
      )
    ).toBeTruthy();
  });

  it('maps primary_email -> errorOwnPrimary copy', async () => {
    H.callableFn.setImpl(() => {
      throw new FakeCallableError(
        'functions/invalid-argument',
        'Primary',
        { reason: 'primary_email' }
      );
    });
    render(<AddAlternateEmail lang="es" />);
    await typeAndSubmit('caller@example.com');
    expect(
      screen.getByText(/correo principal de tu cuenta/i)
    ).toBeTruthy();
  });

  it('maps invalid_format -> errorInvalid copy', async () => {
    H.callableFn.setImpl(() => {
      throw new FakeCallableError(
        'functions/invalid-argument',
        'Bad email',
        { reason: 'invalid_format' }
      );
    });
    render(<AddAlternateEmail lang="es" />);
    await typeAndSubmit('whatever@x.y');
    expect(screen.getByText(/^Correo inválido$/i)).toBeTruthy();
  });

  it('maps rate_limited -> errorRateLimited copy', async () => {
    H.callableFn.setImpl(() => {
      throw new FakeCallableError(
        'functions/resource-exhausted',
        'Rate',
        { reason: 'rate_limited' }
      );
    });
    render(<AddAlternateEmail lang="es" />);
    await typeAndSubmit('new@example.com');
    expect(
      screen.getByText(/Demasiados intentos|Too many attempts/i)
    ).toBeTruthy();
  });

  it('maps an unknown error -> generic fallback copy', async () => {
    H.callableFn.setImpl(() => {
      throw new FakeCallableError(
        'functions/internal',
        'kaboom',
        { reason: 'something_else' }
      );
    });
    render(<AddAlternateEmail lang="es" />);
    await typeAndSubmit('new@example.com');
    expect(
      screen.getByText(/No se pudo procesar la solicitud/i)
    ).toBeTruthy();
  });

  it('maps res.data.alreadyLinked=true -> errorAlreadyLinked merge copy', async () => {
    H.callableFn.setImpl(async () => ({
      data: { ok: true, alreadyLinked: true },
    }));
    render(<AddAlternateEmail lang="es" />);
    await typeAndSubmit('claimed@example.com');
    expect(
      screen.getByText(/ya pertenece a otra cuenta de SECiD/i)
    ).toBeTruthy();
  });

  it('disables submit while the callable is in-flight', async () => {
    let resolveCallable: (v: unknown) => void = () => {};
    H.callableFn.setImpl(
      () => new Promise((resolve) => (resolveCallable = resolve))
    );
    render(<AddAlternateEmail lang="es" />);
    fireEvent.change(getEmailInput(), {
      target: { value: 'new@example.com' },
    });
    await act(async () => {
      fireEvent.click(getSubmitButton());
    });
    // While the callable hasn't resolved yet, button is disabled and shows
    // the "sending" label.
    expect(getSubmitButton().disabled).toBe(true);
    expect(getSubmitButton().textContent).toMatch(/Enviando|Sending/i);
    // Resolve so the test cleanly exits the in-flight state.
    await act(async () => {
      resolveCallable({ data: { ok: true } });
    });
  });
});
