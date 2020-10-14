'use strict'

const axios = require('axios');

const Configly = require('./index.js');

jest.mock('axios');

const serverResp = {
  data: {
    slogan: { type: 'string', value: 'what exactly is a yeet', ttl: 120 },
    cities: { type: 'jsonBlob', value: ['medellin', 'boston', 'nyc'], ttl: 5 },
    eatDonuts: { type: 'boolean', value: true, ttl: 60 },
  },
  missingKeys: [],
};

// axios stores response data in a 'data' field
axios.get.mockResolvedValue({ data: serverResp });

const KEY = 'IM A KEY!!!';

test('Overriding the host works', () => {
  const host = 'http://afakehost.ly';
  const configly = new Configly(KEY, { host });
  configly.get('slogan');
  let matcher = expect.stringMatching(new RegExp(`^${host}`));
  expect(axios.get).toHaveBeenCalledWith(matcher, expect.anything());
});

test('Default URL is expected', () => {
  const configly = new Configly(KEY);
  configly.get('slogan');

  const EXPECTED_URL = 'https://config.ly/';
  let matcher = expect.stringMatching(new RegExp(`^${EXPECTED_URL}`));
  expect(axios.get).toHaveBeenCalledWith(matcher, expect.anything());
});

test('Cache is populated with default settings', async done => {
  const configly = new Configly(KEY);
  //expect(configly.cache).toBe({});
  let key = 'slogan';
  try {
    await configly.get(key);
  } catch (error) {
    done(error);
  }

  const { data } = serverResp;
  expect(configly.cache).toMatchObject({[key]: data[key].value});
  expect(Object.keys(configly.cache || {}).length).toBe(1);

  const EXPECTED_URL = 'https://config.ly/';
  let matcher = expect.stringMatching(new RegExp(`^${EXPECTED_URL}`));
  expect(axios.get).toHaveBeenCalledWith(matcher, expect.anything());
  done();
});
// disable cache works
// disable cache on get works
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
