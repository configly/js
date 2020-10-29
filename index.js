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
 * Each get(key) returns a Promise; the first argument to the Promise fulfillment method is the
 * Configly value for the supplied key. Please see the example:
 *
 * const Configly = require('Configly');
 * const configly = Configly.init('API_KEY');
 *
 * configly.get('keyOne').then((value) => console.log(value));
 *
 * // or
 *
 * const run = async () => {
 *   return await configly.get('keyOne');
 * }
 *
 * Note that get(key) may or may not make a server request or fetch a cached value. You should
 * assume it'll make a (fast) HTTP request. If you need something guaranteed to be faster, we
 * recommend storing the value to a local variable; BUT, be aware that this means you won't
 * receive updates to that variable, so be sure to call get() periodically.
 */
class Configly {

  /**
   * This method should NOT be called externally; please use Configly.init() or
   * Configly.getInstance()
   *
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
   * Initialize a new `Configly` with your account's `API Key` and an
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
   */
  static init(apiKey, options) {
    assert(apiKey, 'You must supply your API Key. You can find it by logging in to Config.ly');
    if (!!Configly.instance) {
      assert.fail('configly.init() is called multiple times. It can only be called once.');
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
      assert.fail('Configly.getInstance() is called before Configly.init(); you must call init.');
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
   * @return { Promse<String | Number | Boolean | Array | Object> } returns a promise of the stored
   *   value(s) as typed in Config.ly.
   */
  get(key, options) {
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
    if (cacheIsEnabled && this._isCached(key)) {
      return Promise.resolve(this._cacheGet(key));
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
        this.cacheTtl[key] = Configly.getUnixTimestampSecs() + ttl;
        this.cache[key] = value;
      }

      return value;
    }).catch((error) => {
      throw error;
    });
  }

  /**
   * Destroys singleton; really meant for testing snd likely should not be used
   * externally.
   */
  destroy() {
    Configly.instance = null;
  }
}
Configly.instance = null;
module.exports = Configly;
