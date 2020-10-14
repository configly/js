'use strict'
const assert = require('assert');
const axios = require('axios');
const qs = require('qs');
const removeSlash = require('remove-trailing-slash');

const VERSION = require('./package.json').version;

const GET_KEY_IDENTIFIER = 'keys[]';

const GET_API_PATH = '/api/v1/value';


/**
 * Config.ly: the dead simple place to put and retrieve your static/config data.
 *
 * Remember: *do NOT* assign the result of a configly.get() to a long-lived variable; in order for
 * the value to fetch from the server, you must call configly.get().
 *
 * Each get(key) return a promise;
 *
 * const Configly = require('Configly');
 * const configly = new Configly('API_KEY');
 *
 * configly.get('keyOne').then((value) => console.log(value));
 * // or
 * const run = async () => {
 *   return await Configly.get('keyOne');
 * }
 *
 * Note that get(key) may or may not make a server request or fetch a cached value. You should
 * assume it'll make a fast HTTP request. If you need something guaranteed to be faster, we
 * recommend storing the value to a local variable; this means you won't receive updates, so
 * be sure to call get() periodically.
 */
class Configly {
  /**
   * Initialize a new `Configly` with your account's `API Key` and an
   * optional dictionary of `options`.
   *
   * @param {String} writeKey
   * @param {Object} [options] (optional)
   *   @property {Number} host (default: https://config.ly/) - Override the host for requests
   *   @property {Number} enableCache (default: true) - disabling the cache will result in an HTML
   *   fetch on every `get` call
   *   @property {Number} timeout (default: 3000) - timeout for request to Configly for data in ms.
   */
  constructor (apiKey, options) {
    options = options || {};
    assert(apiKey, 'You must supply your API Key. You can find it by logging in to Config.ly');

    this.host = removeSlash(options.host || 'https://config.ly');
    this.cache = {};
    this.cacheTtl = {};
    this.apiKey = apiKey;
    this.enableCache = options.enableCache === undefined ? true : options.enableCache;
    this.timeout = options.timeout || 3000;
  }

  isCached (key) {
    let value = this.cache[key];
    if (!value) {
      return false;
    }
    if (this.cacheTtl[key] < Date.now()) {
      return false
    }
    return true;
  }

  cacheGet (key) {
    return this.cache[key];
  }

  /**
   * Fetch values for supplied key. The value may be cached but is still an async call.
   *
   * @param {String} key - the key to fetch.
   * @param {Object?} [options] optional to override the global parameters for this request (optional)
   *   @property {Number} enableCache (default: true) - disabling the cache will result in an HTML
   *   fetch on every `get` call
   *   @property {Number} timeout (default: 3000) - timeout for request to Configly for data in ms.
   * @return { Promse<String | Number | Boolean | Array | Object> } returns a promise of the stored
   * value(s) as typed in Config.ly.
   */
  get (key, options) {
    assert(typeof key === 'string', 'key must be a string');
    assert(key.length > 0, 'key must be a non-empty string');

    options = options || {};

    const headers = { };
    if (typeof window === 'undefined') {
      headers['user-agent'] = ['configly-node', VERSION].join('/');
    }

    let cacheIsEnabled = true;
    if (options.enableCache !== undefined) {
      cacheIsEnabled = options.enableCache;
    } else if (!this.enableCache) {
      cacheIsEnabled = false;
    }

    // Check the cache
    if (cacheIsEnabled && this.isCached(key)) {
      return Promise.resolve(this.cacheGet(key));
    }

    let url = `${this.host}${GET_API_PATH}`;
    return axios.get(url, {
      auth: {
        username: this.apiKey,
      },
      params: { keys: [ key ] },
      paramsSerializer: (params) => {
        return qs.stringify(params, {arrayFormat: 'brackets'})
      },
      timeout: options.timeout || this.timeout,
    }).then((response) => {
      const { value, ttl } = response.data.data[ key ];

      if (cacheIsEnabled) {
        this.cacheTtl[key] = Date.now() + ttl;
        this.cache[key] = value;
      }

      return value;
    }).catch((error) => {
      throw error;
    });
  }
}

module.exports = Configly;
