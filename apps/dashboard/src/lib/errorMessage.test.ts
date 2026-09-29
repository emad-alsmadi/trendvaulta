import { describe, it, expect } from '@jest/globals';
import { errorMessage } from './api';

describe('errorMessage', () => {
  it('prefers the first field detail of a validation failure, humanised', () => {
    const err = {
      response: {
        status: 400,
        data: {
          message: 'Validation failed',
          details: [{ field: 'usageLimit', message: '"usageLimit" must be greater than or equal to 1' }],
        },
      },
    };
    expect(errorMessage(err, 'fallback')).toBe(
      'Usage limit must be greater than or equal to 1',
    );
  });

  it('uses the API message when there are no details', () => {
    const err = { response: { status: 409, data: { message: 'Coupon code already exists' } } };
    expect(errorMessage(err, 'fallback')).toBe('Coupon code already exists');
  });

  it('never shows axios transport text', () => {
    const network = { request: {}, message: 'Network Error' };
    expect(errorMessage(network, 'fallback')).toMatch(/could not reach the server/i);

    const serverError = {
      response: { status: 502, data: '<html>Bad gateway</html>' },
      message: 'Request failed with status code 502',
    };
    expect(errorMessage(serverError, 'fallback')).toMatch(/server had a problem/i);
  });

  it('falls back when nothing usable is present', () => {
    expect(errorMessage(new Error('boom'), 'Could not save')).toBe('Could not save');
  });
});
