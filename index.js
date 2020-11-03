'use strict'
const axios = require('axios');
const qs = require('qs');
const removeSlash = require('remove-trailing-slash');

const VERSION = require('./package.json').version;

const GET_KEY_IDENTIFIER = 'keys[]';

const GET_API_PATH = '/api/v1/value';

/**
 * Config.ly: the dead simple place to store and retrieve your static/config data.
 *
 * Remember: *do NOT* assign the result of a get() to a long-lived variable; in order for
 * the value to fetch from the server, you must call get().
 *
 * Each get(key) returns a Promise; the first argument to the Promise fulfillment method is the
 * Configly value for the supplied key. Please see the example:
 *
 * const Configly = require('Configly');
 * const configly = Configly.init('API_KEY');
 *
 * configly.get('keyOne').then((valueForKeyOne) => console.log(valueForKeyOne));
 *
 * // or
 *
 * const run = async () => {
 *   return await configly.get('keyOne');
 * }
 *
 * Note that get(key) may make a server request or fetch a cached value. You should
 * assume it'll make a (fast) HTTP request. If you need something guaranteed to be faster, we
 * recommend storing the value to a local variable; BUT, be aware that this means you won't
 * receive updates to that variable, so be sure to call get() periodically.
 */
class Configly {
  /**
   * This method should NOT be called externally; please use Configly.init().
   */
  constructor () {
    if (!!Configly.instance) {
      return Configly.instance;
    }

    this.cache = {};
    this.cacheTtl = {};
    this.host = 'https://api.config.ly';
    this.enableCache = true;
    this.apiKey = '';
    this.timeout = 3000;
  }

  /*
   * Initialize the `Configly` singleton with your account's `API Key` and an
   * optional dictionary of `options`.
   *
   * @param {String} apiKey - your readonly Config.ly API key. You can find it at
   *   http://config.ly/config.
   * @param {Object} [options] (optional)
   *     @property {Number} host (default: https://config.ly/) - Overrides the host for requests
   *     @property {Number} enableCache (default: true) - disables the cache, resulting in an HTTP
   *       fetch on every `get` call
   *     @property {Number} timeout (default: 3000) - ms timeout for requests to Configly for data.
   * @return Configly instance
   * @throws Error if an API Key is not supplied or if init is called multiple times.
   */
  static init(apiKey, options) {
    if (!apiKey || !apiKey.length || apiKey.length == 0) {
      throw new Error('You must supply your API Key. You can find it by logging in to Config.ly');
    }

    if (!!Configly.instance) {
      throw new Error('configly.init() is called multiple times. It can only be called once.');
    }

    let inst = new Configly();
    options = options || {};
    inst.host = removeSlash(options.host || inst.host);
    inst.enableCache = options.enableCache === undefined ? inst.enableCache : options.enableCache;
    inst.apiKey = apiKey;
    inst.timeout = options.timeout || inst.timeout;
    Configly.instance = inst;
    return Configly.instance;
  }
  /*
   * @return existing Configy instance. Configly.init() must be called before any invocation of
   * getInstance()
   */
  static getInstance() {
    if (!Configly.instance) {
      throw new Error('Configly.getInstance() is called before Configly.init(); you must call init.');
    }
    return Configly.instance;
  }
  static getUnixTimestampSecs() {
    return Math.round(Date.now() / 1000);
  }

  _isCached(key) {
    let value = this.cache[key];
    if (!value) {
      return false;
    }
    if (this.cacheTtl[key] < Configly.getUnixTimestampSecs()) {
      return false
    }
    return true;
  }

  _cacheGet(key) {
    return this.cache[key];
  }

  /**
   * Fetch the value for the supplied key. This is an async call; it may be lightning fast as the
   * value may be cached.
   *
   * Configly.init() must be called before any invocation of get
   *
   * @param {String} key - the key to fetch.
   * @param {Object?} [options] overrides the global parameters set in the constructor for this
   *  `get` request only (optional)
   *     @property {Number} enableCache (default: true) - disables the cache, resulting in an HTTP
   *       fetch on every `get` call.
   *     @property {Number} timeout (default: 3000) - timeout for request to Configly for data in ms.
   * @return { Promse<String | Number | Boolean | Array | Object | Error> } returns, on success,
   *   a promise of fulfilled with the stored value(s) as typed in Config.ly. On error, returns
   *   a failed promise with error:
   *     - TypeError if key is not a string or omitted
   *     - Error if key an empty string
   */
  get(key, options) {
    if (typeof key !== 'string') {
      return Promise.reject(new TypeError('key must be a string'));
    }
    if (!key || key.length == 0) {
      return Promise.reject(new Error('key must be a non-empty string'));
    }

    options = options || {};

    const headers = {
      'Accept': 'application/json',
    };

    // XXX: I think setting custom headers of X- is deprecated but I couldn't find another good
    // header to use.
    headers['X-Lib-Version'] = ['configly-node', VERSION].join('/');

    let cacheIsEnabled = true;
    if (options.enableCache !== undefined) {
      cacheIsEnabled = options.enableCache;
    } else if (!this.enableCache) {
      cacheIsEnabled = false;
    }

    // Check the cache
    if (cacheIsEnabled && this._isCached(key)) {
      return Promise.resolve(this._cacheGet(key));
    }

    let url = `${this.host}${GET_API_PATH}`;
    return axios.get(url, {
      auth: {
        username: this.apiKey,
      },
      headers,
      params: { keys: [ key ] },
      paramsSerializer: (params) => {
        return qs.stringify(params, {arrayFormat: 'brackets'})
      },
      timeout: options.timeout || this.timeout || 3000,
    }).then((response) => {
      let { value, ttl } = response.data.data[ key ] || {};

      // There should always be a TTL. But just in case.
      ttl = ttl || 60;
      if (cacheIsEnabled && value !== undefined) {
        this.cacheTtl[key] = Configly.getUnixTimestampSecs() + ttl;
        this.cache[key] = value;
      }

      return value;
    }).catch(Configly.handleGetError);
  }
  static makeError(status, message, originalError) {
    return { status, message, originalError }
  }

  static handleGetError(error) {
    let status = Configly.ERRORS.OTHER;
    let message = [
      'Something went wrong. Have you upgraded to the latest client?',
      "Take a look at 'originalError' inside the error object for more details."
    ].join('');

    if (error.response) {
      status = error.response.status;
      status = status == 401 ? Configly.ERRORS.INVALID_API_KEY : Configly.ERRORS.OTHER;
      message = (error.response.data || '').substring(0, 1000);
    } else if (error.code == 'ECONNREFUSED') {
      status = Configly.ERRORS.CONNECTION_ERROR;
      message = [
        'Configly didn\'t receive an HTTP response.',
        'This could be because of a network disruption with the server or a bad supplied hostname.',
        'If you\'ve supplied a host parameter, please ensure it is correct.',
        'Otherwise, try again.'
      ].join(' ');
    }
    return Promise.reject(Configly.makeError(status, message, error));
  };

  /**
   * Destroys singleton; really meant for testing snd likely should not be used
   * externally.
   */
  destroy() {
    Configly.instance = null;
  }
}
Configly.ERRORS = {
  OTHER: 'OTHER',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  INVALID_API_KEY: 'INVALID_API_KEY',
};
Object.freeze(Configly.ERRORS);

Configly.instance = null;
module.exports = Configly;
