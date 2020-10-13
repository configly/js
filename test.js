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
axios.get.mockResolvedValue(serverResp);
/*
*/
const KEY = 'IM A KEY!!!';
// changing host reflects right url
test('Overriding the host works', () => {
  const host = 'http://afakehost.ly';
  const configly = new Configly(KEY, { host });
  configly.get('testval');
  let matcher = expect.stringMatching(new RegExp(`^${host}`));
  expect(axios.get).toHaveBeenCalledWith(matcher, expect.anything());
});
// using default host reflects prod url
// cache is populated by default
// disable cache works
// timeout adjusts the timeout amount
// default timeout value is 3k

// get
// null or undefined string?
// mock a string, boolean, js return type from server => works
// ensure each is cached
// ensure ttl is honored in cache
// error handling
// async / await example cuz I'm a n00b
