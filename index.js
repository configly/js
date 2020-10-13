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
 * Each get(key, cb) call takes a callback:
 *
 * get('keyOne', (value) => console.log(value));
 *
 * Note that get(key, cb) may or may not make a server request.
 */
class Configly {
  /**
   * Initialize a new `Configly` with your account's `API Key` and an
   * optional dictionary of `options`.
   *
   * @param {String} writeKey
   * @param {Object} [options] (optional)
   *   @property {Number} enableCache (default: true) - disabling the cache will result in an HTML
   *   fetch on every `get` call
   *   @property {Number} timeout (default: 3000) - timeout for request to Configly for data in ms.
   *   @property {Object} defaultValues (default: {}) - defaultValues for each key that Configly
   *   will use in case it can't reach the server and it doesn't have a pre-existing value.
   *   When it has a previous value, it will default to that. Ensure the value types match the
   *   types specified on http://config.ly.
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
   * @param {String} key - the keyto fetch.
   * @param {Object?} [options] optional to override the global parameters for this request (optional)
   *   @property {Number} enableCache (default: true) - disabling the cache will result in an HTML
   *   fetch on every `get` call
   *   @property {Number} timeout (default: 3000) - timeout for request to Configly for data in ms.
   * @return { String | Number | Boolean | Array | Object } returns the stored value(s) as typed
   *   in Config.ly.
   */
  get (key, options, callback) {
    const keyIsValid = typeof key === 'string' || Array.isArray(key);
    assert(keyIsValid, 'key must be a string');
    assert(key.length > 0, 'key must be a non-empty string');

    if (callback === undefined && isFunction(options)) {
      callback = options;
    }
    options = options || {};

    const headers = { };
    if (typeof window === 'undefined') {
      headers['user-agent'] = ['configly-node', VERSION].join('/');
    }
    if (typeof key === 'string'){
      key = [key];
    }

    let cacheIsEnabled = true;
    if (options.enableCache !== undefined) {
      cacheIsEnabled = options.enableCache;
    } else if (!this.enableCache) {
      cacheIsEnabled = false;
    }

    // Check the cache
    if (cacheIsEnabled && this.isCached(key)) {
      callback(this.cacheGet(key));
      return;
    }

    let url = `${this.host}${GET_API_PATH}`;
    axios.get(url, {
      auth: {
        username: this.apiKey,
      },
      params: { keys: key },
      paramsSerializer: (params) => {
        return qs.stringify(params, {arrayFormat: 'brackets'})
      },
      timeout: options.timeout || this.timeout,
    }).then((response) => {
      let result = response.data.data[ key ].value;
      let ttl = response.data.ttl;
      this.cacheTtl[key] = Date.now() + ttl;
      this.cache[key] = result;
      if (callback) callback(result);
    }).catch((error) => {
      if (callback) callback(null, error);
    });
  }
}

// From underscore.js: http://underscorejs.org/
function isFunction(obj) {
 return !!(obj && obj.constructor && obj.call && obj.apply);
}

module.exports = Configly;
