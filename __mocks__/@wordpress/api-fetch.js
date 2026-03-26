/**
 * Manual Jest mock for @wordpress/api-fetch.
 *
 * Tests that import this module explicitly call jest.mock('@wordpress/api-fetch'),
 * so this file just needs to be resolvable. The mock function is replaced per-test
 * via mockResolvedValue / mockRejectedValue.
 */
const apiFetch = jest.fn();
apiFetch.use = jest.fn();
apiFetch.setFetchHandler = jest.fn();
apiFetch.createNonceMiddleware = jest.fn();
apiFetch.createRootURLMiddleware = jest.fn();
apiFetch.createThemePreviewMiddleware = jest.fn();

module.exports = apiFetch;
module.exports.default = apiFetch;
