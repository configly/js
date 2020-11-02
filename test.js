'use strict'

const axios = require('axios');
const Configly = require('./index.js');

jest.mock('axios');

const SLOGAN_VALUE = 'what exactly is a yeet';
const SLOGAN_TTL = 120;
const CITIES_VALUE = ['medellin', 'boston', 'nyc'];
const CITIES_TTL = 5;
const EAT_DONUTS_VALUE = true;
const serverResp = {
  data: {
    slogan: { type: 'string', value: SLOGAN_VALUE , ttl: SLOGAN_TTL },
    cities: { type: 'jsonBlob', value: CITIES_VALUE , ttl: CITIES_TTL },
    eatDonuts: { type: 'boolean', value: EAT_DONUTS_VALUE, ttl: 60 },
  },
  missingKeys: [],
};

const KEY = 'IM AN API KEY!!!';

// Configly is a singleton, clear the singleton and re-initialize after each test
let client = null;
beforeEach(() => {
  if (!!client) {
    client.destroy();
  }
  // axios stores response data in a 'data' field
  axios.get.mockResolvedValue({ data: serverResp });
});

afterEach(() => {
  jest.clearAllMocks()
    .resetModules();
});

/** Init Tests **/
test('Overriding the host works', () => {
  const host = 'http://afakehost.ly';
  client = Configly.init(KEY, { host });
  client.get('slogan');

  let matcher = expect.stringMatching(new RegExp(`^${host}`));
  expect(axios.get).toHaveBeenCalledWith(matcher, expect.anything());
});

test('Default URL is expected', () => {
  client = Configly.init(KEY);
  client.get('slogan');

  const EXPECTED_URL = 'https://api.config.ly/';
  let matcher = expect.stringMatching(new RegExp(`^${EXPECTED_URL}`));
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledWith(matcher, expect.anything());
});

test('Error is thrown with no API key', () => {
  let e = null;
  try {
    Configly.init();
  } catch (error) {
    e = error;
  }
  expect(e).toBeTruthy();
});

test('Error is thrown with blank API key', () => {
  let e = null;
  try {
    Configly.init('');
  } catch (error) {
    e = error;
  }
  expect(e).toBeTruthy();
});

test('Error is thrown if init is called multiple times', () => {
  let e = null;
  Configly.init('abc');
  try {
    Configly.init('bdc');
  } catch (error) {
    e = error;
  }
  expect(e).toBeTruthy();
});

test('Init returns instance', () => {
  let i = Configly.init('abc');
  expect(i).toBe(Configly.getInstance());
});

test('Calling constructor after init returns Singleton', () => {
  const host = 'http://afakehost.ly';
  client = Configly.init(KEY, { host });
  expect(new Configly()).toBe(client)
});


/** Timeout **/
test('Default timeout of 3000 used', async done => {
  await Configly.init('abc').get('slogan');

  expect(axios.get).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({timeout: 3000}));
  done();
});

test('Global timeout override works', async done => {
  const timeout = 5000
  await Configly.init('abc', { timeout }).get('slogan');

  expect(axios.get).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ timeout }));
  done();
});

test('get() timeout override works ', async done => {
  const timeout = 2000;
  await Configly.init('abc').get('slogan', { timeout });

  expect(axios.get).toHaveBeenNthCalledWith(
    1,
    expect.anything(),
    expect.objectContaining({timeout }));

  // Other calls use the global default
  await Configly.getInstance().get('cities');

  expect(axios.get).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    expect.objectContaining({ timeout: 3000 }));
  done();
});

/** getInstance() tests **/
test('Calling getInstance() without init results in an error', () => {
  expect(Configly.getInstance.bind(Configly)).toThrow(Error);
});


/** get() tests **/
test('get() returns rejected promise error with no key', (done) => {
  let e = null;
  let c = Configly.init(KEY);
  c.get()
    .then(null, (e) => {
      expect(e).toEqual(new TypeError('key must be a string'));
      done();
    });
});

test('get() returns rejected promise error with strange key', (done) => {
  let e = null;
  let c = Configly.init(KEY);
  c.get([])
    .then(null, (e) => {
      expect(e).toEqual(new TypeError('key must be a string'));
      done();
    });
});

test('get() returns rejected promise error with empty string', (done) => {
  let e = null;
  let c = Configly.init(KEY);
  c.get('')
    .then(null, (e) => {
      expect(e).toEqual(new Error('key must be a non-empty string'));
      done();
    });
});

/** get() Error Handling **/

test('get() called with an unknown key', async (done) => {
  const key = 'non-existing-key';
  let v = await Configly.init('abc').get(key);
  expect(v).toEqual(undefined);
  expect(Configly.getInstance().cache[key]).toEqual(undefined);

  done();
});

test('get() called with an unknown ApiToken', async (done) => {
  const error = {
    response: {
      status: 401,
      data: 'Not allowed',
    }
  };
  axios.get.mockResolvedValue(Promise.reject(error));

  const key = 'non-existing-key';
  let wasError = false;
  try {
    await Configly.init('abc').get(key);
  } catch (e) {
    wasError = true;
    expect(e.status).toEqual(Configly.ERRORS.INVALID_API_KEY);
    expect(e.message).toEqual('Not allowed');
    expect(e.originalError).toEqual(error);
  }
  expect(wasError).toEqual(true);
  done();
});

test('get() called with an arbitrary HTTP error', async (done) => {
  const error = {
    response: {
      status: 500,
      data: 'Arbitrary error',
    }
  };
  axios.get.mockResolvedValue(Promise.reject(error));

  const key = 'non-existing-key';
  let wasError = false;
  try {
    await Configly.init('abc').get(key);
  } catch (e) {
    wasError = true;
    expect(e.status).toEqual(Configly.ERRORS.OTHER);
    expect(e.message).toEqual('Arbitrary error');
    expect(e.originalError).toEqual(error);
  }
  expect(wasError).toEqual(true);
  done();
});

test('get() connection error', async (done) => {
  const error = {
    code: 'ECONNREFUSED',
  };
  axios.get.mockResolvedValue(Promise.reject(error));
  const key = 'non-existing-key';
  let wasError = false;
  try {
    await Configly.init('abc').get(key);
  } catch (e) {
    wasError = true;
    expect(e.status).toEqual(Configly.ERRORS.CONNECTION_ERROR);
    expect(e.originalError).toEqual(error);
  }
  expect(wasError).toEqual(true);
  done();
});

/** Cache tests **/
test('Cache is populated with default settings', async done => {
  client = Configly.init(KEY);

  expect(client.cache).toEqual({});

  let key = 'slogan';
  try {
    await client.get(key);
  } catch (error) {
    done(error);
  }

  const { data } = serverResp;
  expect(client.cache).toMatchObject({[key]: data[key].value});
  expect(Object.keys(client.cache || {}).length).toBe(1);
  expect(axios.get).toHaveBeenCalledTimes(1);

  done();
});

test('Cache returns value', async done => {
  client = Configly.init(KEY);

  expect(client.cache).toEqual({});

  let key = 'slogan';
  try {
    await client.get(key);
  } catch (error) {
    done(error);
  }

  const { data } = serverResp;
  expect(client.cache).toMatchObject({[key]: data[key].value});
  expect(Object.keys(client.cache || {}).length).toBe(1);

  let v = null;
  try {
    v = await client.get(key);
  } catch (error) {
    done(error);
  }

  expect(v).toEqual(SLOGAN_VALUE);
  expect(axios.get).toHaveBeenCalledTimes(1);
  done();
});

test('Global disable cache works', async done => {
  client = Configly.init(KEY, { enableCache: false });

  expect(client.cache).toEqual({});

  let key = 'slogan';
  try {
    await client.get(key);
  } catch (error) {
    done(error);
  }

  const { data } = serverResp;
  expect(client.cache).toEqual({});

  expect(axios.get).toHaveBeenCalledTimes(1);

  // Try again on a second attempt
  try {
    await client.get(key);
  } catch (error) {
    done(error);
  }

  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(client.cache).toEqual({});

  done();
});

test('Caching works for multiple values', async done => {
  client = Configly.init(KEY);

  expect(client.cache).toEqual({});

  let key1 = 'slogan';
  let key2 = 'cities';

  let a, b, c = null
  try {
    a = await client.get(key1);
    b = await client.get(key2);
  } catch (error) {
    done(error);
  }
  expect(a).toEqual(SLOGAN_VALUE);
  expect(b).toEqual(CITIES_VALUE);

  const { data } = serverResp;
  expect(client.cache).toEqual({
    [key1] : SLOGAN_VALUE,
    [key2] : CITIES_VALUE,
  });

  let key3 = 'eatDonuts';
  try {
    c = await client.get(key3);
  } catch (error) {
    done(error);
  }
  expect(c).toEqual(EAT_DONUTS_VALUE);

  expect(client.cache).toEqual({
    [key1] : SLOGAN_VALUE,
    [key2] : CITIES_VALUE,
    [key3] : EAT_DONUTS_VALUE,
  });

  done();
});

test('Caching respects TTL correctly', async done => {
  client = Configly.init(KEY);
  let timeNow = 5;
  jest.spyOn(Date, 'now')
    .mockReturnValue(timeNow*1000)

  let key = 'slogan';
  let a = null;
  try {
    a = await client.get(key);
  } catch (error) {
    done(error);
  }

  const { data } = serverResp;

  // Try again on a second attempt
  let b = null;
  try {
    b = await client.get(key);
  } catch (error) {
    done(error);
  }
  expect(a).toBe(b);
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(client.cacheTtl).toEqual({
    [key]: timeNow + SLOGAN_TTL,
  });

  // Set to almost before expiry
  jest.spyOn(Date, 'now')
    .mockReturnValue(1000*(timeNow + SLOGAN_TTL - 1));

  // Try again on a third attempt
  let c = null;
  try {
    c = await client.get(key);
  } catch (error) {
    done(error);
  }
  expect(c).toBe(b);
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(client.cacheTtl).toEqual({
    [key]: timeNow + SLOGAN_TTL,
  });

  // Set to after expiry
  let newTimeNow = timeNow + SLOGAN_TTL + 1;
  jest.spyOn(Date, 'now')
    .mockReturnValue(1000*newTimeNow)

  let newTtl = 300;
  let newVal = 555;
  let newResp = {
    data: {
      slogan: { type: 'number', value: newVal, ttl: newTtl },
    },
    missingKeys: [],
  };
  axios.get.mockResolvedValue({ data: newResp });

  // Fetch again with new val + TTL
  let d = null;
  try {
    d = await client.get(key);
  } catch (error) {
    done(error);
  }
  expect(d).toEqual(newVal);
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(client.cacheTtl).toEqual({
    [key]: newTimeNow + newTtl,
  });

  // Confirm caching / TTL respected
  let e = null;
  try {
    e = await client.get(key);
  } catch (error) {
    done(error);
  }
  expect(e).toEqual(d);

  // Only two total HTTP requests
  expect(axios.get).toHaveBeenCalledTimes(2);

  done();
});


test('Caching respects TTL correctly with several values', async done => {
  client = Configly.init(KEY);
  let timeNow = 5;
  jest.spyOn(Date, 'now')
    .mockReturnValue(timeNow*1000)

  let key1 = 'slogan';
  let key2 = 'cities';
  let a, b = null;
  try {
    a = await client.get(key1);
    b = await client.get(key2);
  } catch (error) {
    done(error);
  }
  expect(a).toEqual(SLOGAN_VALUE);
  expect(b).toEqual(CITIES_VALUE);

  const { data } = serverResp;

  // Try again on a second attempt
  let c, d = null;
  try {
    c = await client.get(key1);
    d = await client.get(key2);
  } catch (error) {
    done(error);
  }
  expect(a).toBe(c);
  expect(b).toBe(d);
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(client.cacheTtl).toEqual({
    [key1]: timeNow + SLOGAN_TTL,
    [key2]: timeNow + CITIES_TTL,
  });

  // Set to almost before expiry of SECOND value
  jest.spyOn(Date, 'now')
    .mockReturnValue(1000*(timeNow + CITIES_TTL - 1));

  // Try again on a third attempt
  try {
    await client.get(key1);
    await client.get(key2);
  } catch (error) {
    done(error);
  }
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(client.cacheTtl).toEqual({
    [key1]: timeNow + SLOGAN_TTL,
    [key2]: timeNow + CITIES_TTL,
  });

  // Set to after expiry
  let newTimeNow = timeNow + CITIES_TTL + 1;
  jest.spyOn(Date, 'now')
    .mockReturnValue(1000*newTimeNow)

  let newTtl = 400;
  let newVal = 'boston <3';
  let newResp = {
    data: {
      slogan: serverResp['data']['slogan'],
      cities: { type: 'string', value: newVal, ttl: newTtl },
    },
    missingKeys: [],
  };
  axios.get.mockResolvedValue({ data: newResp });

  // Fetch again with new val + TTL
  let e, f = null;
  try {
    e = await client.get(key1);
    f = await client.get(key2);
  } catch (error) {
    done(error);
  }
  expect(e).toEqual(c);
  expect(f).toEqual(newVal);
  expect(axios.get).toHaveBeenCalledTimes(3);
  expect(client.cacheTtl).toEqual({
    [key1]: timeNow + SLOGAN_TTL,
    [key2]: newTimeNow + newTtl,
  });

  // Confirm caching / TTL respected
  let g = null;
  try {
    g = await client.get(key2);
  } catch (error) {
    done(error);
  }
  expect(g).toEqual(f);

  // Only three total HTTP requests
  expect(axios.get).toHaveBeenCalledTimes(3);

  // Finally, update the value for FIRST cached entry
  let newTimeAgain = timeNow + SLOGAN_TTL + 50;
  jest.spyOn(Date, 'now')
    .mockReturnValue(1000*newTimeAgain)

  let h = null;
  try {
    h = await client.get(key1);
    await client.get(key2);
  } catch (error) {
    done(error);
  }
  expect(h).toEqual(a);
  expect(client.cacheTtl).toEqual({
    [key1]: newTimeAgain + SLOGAN_TTL,
    [key2]: newTimeNow + newTtl,
  });

  // Total of four HTTP calls.
  expect(axios.get).toHaveBeenCalledTimes(4);

  done();
});

// TODO: HTTP response fails, return default cached value.

test('get() disable cache works on first fetch', async done => {
  client = Configly.init(KEY);

  expect(client.cache).toEqual({});

  let key = 'slogan';
  let a = null;
  try {
    a = await client.get(key, { enableCache: false });
  } catch (error) {
    done(error);
  }

  expect(client.cache).toEqual({});

  // Only hit once as caching worked.
  expect(axios.get).toHaveBeenCalledTimes(1);

  done();
});

test('get() disable cache works on third fetch', async done => {
  client = Configly.init(KEY);

  expect(client.cache).toEqual({});

  let key = 'slogan';
  let a = null;
  try {
    a = await client.get(key);
  } catch (error) {
    done(error);
  }

  const { data } = serverResp;
  expect(client.cache).toEqual({ [key] : SLOGAN_VALUE } );

  // Cached value returned
  let b = null;
  try {
    b = await client.get(key);
  } catch (error) {
    done(error);
  }

  // Only hit once as caching worked.
  expect(axios.get).toHaveBeenCalledTimes(1);

  expect(a).toEqual(b);
  let c = null;
  try {
    c = await client.get(key, { enableCache: false });
  } catch (error) {
    done(error);
  }
  expect(b).toEqual(c);

  // Note it was called twice as the caching worked the middle time.
  expect(axios.get).toHaveBeenCalledTimes(2);
  done();
});
