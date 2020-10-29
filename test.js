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


const KEY = 'IM A KEY!!!';

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

test('Get() disable cache works on first fetch', async done => {
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

test('Get() disable cache works on third fetch', async done => {
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

// ensure correct data is sent to server
// timeout adjusts the timeout amount
// default timeout value is 3k

// get
// null or undefined string?
// mock a string, boolean, js return type from server => works
// ensure each is cached
// ensure ttl is honored in cache
// error handling
// async / await example cuz I'm a n00b
